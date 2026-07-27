"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TicketStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeBill, resolveBillShow } from "@/lib/bill";
import { fetchBillTicket } from "@/lib/bill-data";
import { saveUploads } from "@/lib/uploads";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/config";
import {
  doneLabel,
  milestoneDescription,
  pickupNote,
  statusHeadline,
} from "@/lib/status";
import { receivedItemsNote, type ReceivedItem } from "@/lib/received-items";
import { ISSUE_REPORTABLE_STATUSES } from "@/lib/repair-issue";
import { getShopInfo } from "@/lib/settings";
import {
  DONE_TICKET_STATUSES,
  syncCompletedRepairs,
} from "@/lib/completed-repairs";
import { nextTicketNumber } from "@/lib/next-ticket-number";

export type TicketFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

const TICKET_STATUSES = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "CANCELLED",
] as const;

const DEVICE_TYPES = ["PHONE", "TABLET", "LAPTOP", "SMARTWATCH", "OTHER"] as const;

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined);
}

function optionalMoney() {
  return z
    .union([z.literal(""), z.coerce.number().min(0)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v));
}

// ── Customer self-service submission ─────────────────────────────

const createTicketSchema = z.object({
  deviceType: z.enum(DEVICE_TYPES),
  brand: z.string().trim().min(2, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  issueTitle: z.string().trim().min(5, "Give the issue a short title (min 5 characters)"),
  issueDescription: z
    .string()
    .trim()
    .min(20, "Describe the issue in at least 20 characters"),
});

export async function createTicket(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = createTicketSchema.safeParse({
    deviceType: formData.get("deviceType"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    issueTitle: formData.get("issueTitle"),
    issueDescription: formData.get("issueDescription"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File);
  const uploaded = await saveUploads(photos, "tickets");
  if (uploaded.error) return { error: uploaded.error };

  const ticket = await prisma.$transaction(async (tx) => {
    const ticketNumber = await nextTicketNumber(tx);
    const created = await tx.repairTicket.create({
      data: {
        ...parsed.data,
        customerId: session.user.id,
        photos: uploaded.urls ?? [],
        ticketNumber,
        // Online submissions wait for shop acceptance before entering the
        // normal pipeline — see acceptTicket.
        status: "SUBMITTED",
      },
    });
    await tx.statusUpdate.create({
      data: {
        ticketId: created.id,
        status: "SUBMITTED",
        note: "Repair request submitted online. Our team will review and confirm shortly.",
      },
    });
    return created;
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: `New repair request ${ticket.ticketNumber} — needs confirmation`,
        body: `${parsed.data.brand} ${parsed.data.model} — ${parsed.data.issueTitle}`,
        href: `/admin/tickets/${ticket.id}`,
      })),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect(`/repairs/${ticket.id}?created=1`);
}

// ── Admin: manual repair log ─────────────────────────────────────

const adminTicketSchema = z.object({
  customerId: optionalText(50),
  customerName: optionalText(120),
  deviceType: z.enum(DEVICE_TYPES),
  brand: optionalText(60),
  model: optionalText(80),
  issueTitle: z.string().trim().min(3, "Issue is required"),
  issueDescription: optionalText(2000),
  solution: optionalText(2000),
  status: z.enum(TICKET_STATUSES),
  completedAt: optionalText(20),
  estimatedCost: optionalMoney(),
  finalCost: optionalMoney(),
  partsCost: optionalMoney(),
  paidAmount: optionalMoney(),
  duration: optionalText(60),
  partsUsed: optionalText(200),
  partsSupplier: optionalText(200),
  adminNotes: optionalText(4000),
  forgottenParts: optionalText(200),
});

function parseAdminTicketForm(formData: FormData) {
  return adminTicketSchema.safeParse({
    customerId: formData.get("customerId"),
    customerName: formData.get("customerName"),
    deviceType: formData.get("deviceType"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    issueTitle: formData.get("issueTitle"),
    issueDescription: formData.get("issueDescription"),
    solution: formData.get("solution"),
    status: formData.get("status"),
    completedAt: formData.get("completedAt"),
    estimatedCost: formData.get("estimatedCost") ?? "",
    finalCost: formData.get("finalCost") ?? "",
    partsCost: formData.get("partsCost") ?? "",
    paidAmount: formData.get("paidAmount") ?? "",
    duration: formData.get("duration"),
    partsUsed: formData.get("partsUsed"),
    partsSupplier: formData.get("partsSupplier"),
    adminNotes: formData.get("adminNotes"),
    forgottenParts: formData.get("forgottenParts"),
  });
}

// Same shape as adminTicketSchema minus customerId/customerName —
// the edit-details form doesn't render those fields (customer linking
// is handled separately by linkTicketCustomer), so requiring them here
// made formData.get() return null and fail validation silently.
const ticketDetailsSchema = adminTicketSchema.omit({
  customerId: true,
  customerName: true,
});

function parseTicketDetailsForm(formData: FormData) {
  return ticketDetailsSchema.safeParse({
    deviceType: formData.get("deviceType"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    issueTitle: formData.get("issueTitle"),
    issueDescription: formData.get("issueDescription"),
    solution: formData.get("solution"),
    status: formData.get("status"),
    completedAt: formData.get("completedAt"),
    estimatedCost: formData.get("estimatedCost") ?? "",
    finalCost: formData.get("finalCost") ?? "",
    partsCost: formData.get("partsCost") ?? "",
    paidAmount: formData.get("paidAmount") ?? "",
    duration: formData.get("duration"),
    partsUsed: formData.get("partsUsed"),
    partsSupplier: formData.get("partsSupplier"),
    adminNotes: formData.get("adminNotes"),
    forgottenParts: formData.get("forgottenParts"),
  });
}

// Interpret a `datetime-local` value ("2026-07-24T15:30", no zone) as
// Asia/Colombo wall-clock time and return the matching UTC instant. Colombo
// is a fixed UTC+5:30 with no DST, so a plain offset subtraction is exact —
// this keeps a custom bill date landing on the day/time the admin picked,
// regardless of the server's own timezone (Vercel runs in UTC).
const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function parseColomboLocal(input: string): Date | null {
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const utcMs =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)) -
    COLOMBO_OFFSET_MS;
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveCompletedAt(
  status: TicketStatus,
  completedAtInput: string | undefined,
): Date | null {
  const done = status === "COMPLETED" || status === "PICKED_UP";
  if (!done) return null;
  if (completedAtInput) {
    const d = new Date(completedAtInput);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export async function adminCreateTicket(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const parsed = parseAdminTicketForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const customerId = data.customerId === "none" ? undefined : data.customerId;
  if (!customerId && !data.customerName) {
    return { error: "Pick a customer account or enter a customer name." };
  }

  const completedAt = resolveCompletedAt(data.status, data.completedAt);

  const ticket = await prisma.$transaction(async (tx) => {
    const ticketNumber = await nextTicketNumber(tx);
    const created = await tx.repairTicket.create({
      data: {
        ticketNumber,
        customerId: customerId ?? null,
        customerName: data.customerName ?? null,
        deviceType: data.deviceType,
        brand: data.brand ?? null,
        model: data.model ?? null,
        issueTitle: data.issueTitle,
        issueDescription: data.issueDescription ?? null,
        solution: data.solution ?? null,
        status: data.status,
        estimatedCost: data.estimatedCost,
        finalCost: data.finalCost,
        partsCost: data.partsCost,
        paidAmount: data.paidAmount,
        duration: data.duration ?? null,
        partsUsed: data.partsUsed ?? null,
        partsSupplier: data.partsSupplier ?? null,
        adminNotes: data.adminNotes ?? null,
        forgottenParts: data.forgottenParts ?? null,
        completedAt,
      },
    });
    await tx.statusUpdate.create({
      data: {
        ticketId: created.id,
        status: data.status,
        note: "Repair log added by shop.",
        createdAt: completedAt ?? new Date(),
      },
    });
    if (customerId) {
      await syncCompletedRepairs(tx, customerId);
    }
    return created;
  });

  revalidatePath("/admin/tickets");
  revalidatePath("/admin");
  redirect(`/admin/tickets/${ticket.id}`);
}

// ── Admin: edit full repair details ──────────────────────────────

export async function updateTicketDetails(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const ticketId = formData.get("ticketId");
  if (typeof ticketId !== "string") return { error: "Invalid ticket." };

  const parsed = parseTicketDetailsForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const existing = await prisma.repairTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, completedAt: true },
  });
  if (!existing) return { error: "Ticket not found." };

  await prisma.repairTicket.update({
    where: { id: ticketId },
    data: {
      deviceType: data.deviceType,
      brand: data.brand ?? null,
      model: data.model ?? null,
      issueTitle: data.issueTitle,
      issueDescription: data.issueDescription ?? null,
      solution: data.solution ?? null,
      estimatedCost: data.estimatedCost ?? null,
      finalCost: data.finalCost ?? null,
      partsCost: data.partsCost ?? null,
      paidAmount: data.paidAmount ?? null,
      duration: data.duration ?? null,
      partsUsed: data.partsUsed ?? null,
      partsSupplier: data.partsSupplier ?? null,
      adminNotes: data.adminNotes ?? null,
      forgottenParts: data.forgottenParts ?? null,
      ...(data.completedAt
        ? { completedAt: resolveCompletedAt("COMPLETED", data.completedAt) }
        : {}),
    },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/repairs/${ticketId}`);
  return { success: true };
}

// ── Admin: bill notes (customer-facing, shown on the invoice) ────

export async function updateBillNotes(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const ticketId = formData.get("ticketId");
  if (typeof ticketId !== "string") return { error: "Invalid ticket." };

  const parsed = z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .safeParse(formData.get("billNotes") ?? "");
  if (!parsed.success) return { error: "Notes are too long (max 2000)." };

  await prisma.repairTicket.update({
    where: { id: ticketId },
    data: { billNotes: parsed.data || null },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/bill/${ticketId}`);
  return { success: true };
}

// ── Admin: build & generate the itemised bill ────────────────────

const billItemSchema = z.object({
  label: z.string().trim().min(1).max(100),
  amount: z.coerce.number().min(0).max(100_000_000),
});

const generateBillSchema = z.object({
  ticketId: z.string().min(1),
  technician: optionalText(120),
  issueTitle: optionalText(200),
  solution: optionalText(2000),
  warrantyPeriod: optionalText(60),
  warrantyParts: optionalText(200),
  discountMode: z.enum(["none", "percent", "amount"]),
  discountValue: optionalMoney(),
  billDate: optionalText(40),
  payBankName: optionalText(120),
  payBranch: optionalText(120),
  payAccountName: optionalText(120),
  payAccountNumber: optionalText(60),
});

export async function generateBill(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const parsed = generateBillSchema.safeParse({
    ticketId: formData.get("ticketId"),
    technician: formData.get("technician"),
    issueTitle: formData.get("issueTitle"),
    solution: formData.get("solution"),
    warrantyPeriod: formData.get("warrantyPeriod"),
    warrantyParts: formData.get("warrantyParts"),
    discountMode: formData.get("discountMode"),
    discountValue: formData.get("discountValue") ?? "",
    billDate: formData.get("billDate"),
    payBankName: formData.get("payBankName"),
    payBranch: formData.get("payBranch"),
    payAccountName: formData.get("payAccountName"),
    payAccountNumber: formData.get("payAccountNumber"),
  });
  if (!parsed.success) {
    return { error: "Some bill fields are invalid — please check and retry." };
  }
  const data = parsed.data;

  // Field-visibility toggles arrive as a JSON object of booleans.
  let showRaw: unknown = {};
  try {
    showRaw = JSON.parse((formData.get("billShowJson") as string) || "{}");
  } catch {
    showRaw = {};
  }
  const billShow = resolveBillShow(showRaw);

  // Line items arrive as a JSON string from the client builder.
  let rawItems: unknown;
  try {
    rawItems = JSON.parse((formData.get("itemsJson") as string) || "[]");
  } catch {
    return { error: "Couldn't read the bill items." };
  }
  const itemsParsed = z.array(billItemSchema).max(40).safeParse(rawItems);
  if (!itemsParsed.success) {
    return { error: "One or more line items are invalid." };
  }
  const items = itemsParsed.data.filter((i) => i.label.length > 0);
  if (items.length === 0) {
    return { error: "Add at least one line item before generating the bill." };
  }

  const discountPercent =
    data.discountMode === "percent" ? (data.discountValue ?? null) : null;
  const discountAmount =
    data.discountMode === "amount" ? (data.discountValue ?? null) : null;

  // Mirror the bill total into finalCost so the online-payment amount
  // (repairs/[id] payment card) matches the itemised bill exactly. This
  // uses the same rounding as computeBill's itemised branch.
  const subtotal =
    Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const disc =
    discountAmount != null
      ? Math.min(discountAmount, subtotal)
      : discountPercent != null
        ? Math.round(subtotal * (discountPercent / 100) * 100) / 100
        : 0;
  const total = Math.round((subtotal - disc) * 100) / 100;

  // Only persist bank details that differ from blank — computeBill falls
  // back to the shop default (config) for any field left empty.
  const payTo = {
    bankName: data.payBankName ?? "",
    branch: data.payBranch ?? "",
    accountName: data.payAccountName ?? "",
    accountNumber: data.payAccountNumber ?? "",
  };
  const hasPayTo = Object.values(payTo).some((v) => v !== "");

  // Invoice date: set on first generation and frozen thereafter, unless the
  // admin explicitly re-issues with today's date.
  const existing = await prisma.repairTicket.findUnique({
    where: { id: data.ticketId },
    select: { billGeneratedAt: true },
  });
  // A custom date the admin picked wins over everything. Otherwise: re-issue
  // (or a first-ever generation) stamps now; a plain update keeps the frozen
  // original invoice date.
  const reissue = formData.get("reissue") === "true";
  const customBillDate = data.billDate ? parseColomboLocal(data.billDate) : null;
  if (data.billDate && !customBillDate) {
    return { error: "That bill date & time couldn't be read." };
  }
  const billGeneratedAt =
    customBillDate ??
    (reissue || !existing?.billGeneratedAt ? new Date() : existing.billGeneratedAt);

  await prisma.repairTicket.update({
    where: { id: data.ticketId },
    data: {
      technician: data.technician ?? null,
      billItems: items,
      billDiscountPercent: discountPercent ?? null,
      billDiscountAmount: discountAmount ?? null,
      billPayTo: hasPayTo ? payTo : undefined,
      billGeneratedAt,
      finalCost: total,
      // Only overwrite the ticket's issue when a value is supplied (it's a
      // required field); solution/warranty clear to null when blank.
      ...(data.issueTitle ? { issueTitle: data.issueTitle } : {}),
      solution: data.solution ?? null,
      warrantyPeriod: data.warrantyPeriod ?? null,
      warrantyParts: data.warrantyParts ?? null,
      billShow,
    },
  });

  revalidatePath(`/admin/tickets/${data.ticketId}/bill`);
  revalidatePath(`/admin/tickets/${data.ticketId}`);
  revalidatePath(`/bill/${data.ticketId}`);
  revalidatePath(`/repairs/${data.ticketId}`);
  return { success: true };
}

// ── Admin: mark the bill paid / unpaid (the receipt step) ────────

const markPaidSchema = z.object({
  ticketId: z.string().min(1),
  method: z.enum(["Cash", "Bank transfer", "Card", "Other"]),
});

export async function markBillPaid(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const parsed = markPaidSchema.safeParse({
    ticketId: formData.get("ticketId"),
    method: formData.get("method"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const result = await fetchBillTicket(parsed.data.ticketId);
  if (!result) return { error: "Ticket not found." };

  const { total } = computeBill(result.bill);
  if (!(total > 0)) {
    return { error: "Generate the bill (with a total) before marking it paid." };
  }

  await prisma.repairTicket.update({
    where: { id: parsed.data.ticketId },
    data: {
      paidAmount: total,
      paidAt: new Date(),
      paidMethod: parsed.data.method,
    },
  });

  revalidatePath(`/admin/tickets/${parsed.data.ticketId}/bill`);
  revalidatePath(`/admin/tickets/${parsed.data.ticketId}`);
  revalidatePath(`/bill/${parsed.data.ticketId}`);
  revalidatePath(`/repairs/${parsed.data.ticketId}`);
  return { success: true };
}

export async function markBillUnpaid(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const ticketId = formData.get("ticketId");
  if (typeof ticketId !== "string") return { error: "Invalid ticket." };

  // Clears only the manual paid record — a verified online payment (if any)
  // still keeps the bill settled, by design.
  await prisma.repairTicket.update({
    where: { id: ticketId },
    data: { paidAmount: null, paidAt: null, paidMethod: null },
  });

  revalidatePath(`/admin/tickets/${ticketId}/bill`);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/bill/${ticketId}`);
  revalidatePath(`/repairs/${ticketId}`);
  return { success: true };
}

// ── Admin: link / unlink a customer account ──────────────────────

export async function linkTicketCustomer(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const ticketId = formData.get("ticketId");
  const userId = formData.get("userId");
  if (typeof ticketId !== "string" || typeof userId !== "string") {
    return { error: "Invalid request." };
  }

  const ticket = await prisma.repairTicket.findUnique({
    where: { id: ticketId },
    include: { customer: { select: { name: true } } },
  });
  if (!ticket) return { error: "Ticket not found." };

  const previousCustomerId = ticket.customerId;

  if (userId === "none") {
    await prisma.$transaction(async (tx) => {
      // Unlink — keep a name on record so the ticket still shows an owner
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: {
          customerId: null,
          customerName: ticket.customerName ?? ticket.customer?.name ?? null,
        },
      });
      if (previousCustomerId) {
        await syncCompletedRepairs(tx, previousCustomerId);
      }
    });
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "User not found." };
    await prisma.$transaction(async (tx) => {
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: { customerId: userId },
      });
      await syncCompletedRepairs(tx, userId);
      if (previousCustomerId && previousCustomerId !== userId) {
        await syncCompletedRepairs(tx, previousCustomerId);
      }
      await tx.notification.create({
        data: {
          userId,
          title: `Repair ${ticket.ticketNumber} added to your account`,
          body: `${[ticket.brand, ticket.model].filter(Boolean).join(" ") || "A repair"} — ${ticket.issueTitle}`,
          href: `/repairs/${ticketId}`,
        },
      });
    });
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Admin: edit a timeline note ──────────────────────────────────

const updateNoteSchema = z.object({
  updateId: z.string().min(1),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function updateStatusNote(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const parsed = updateNoteSchema.safeParse({
    updateId: formData.get("updateId"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: "Invalid note." };

  const update = await prisma.statusUpdate.findUnique({
    where: { id: parsed.data.updateId },
    select: { id: true, ticketId: true },
  });
  if (!update) return { error: "Timeline entry not found." };

  // Empty note falls back to the status's default description everywhere
  // the timeline renders.
  await prisma.statusUpdate.update({
    where: { id: update.id },
    data: { note: parsed.data.note || null },
  });

  revalidatePath(`/admin/tickets/${update.ticketId}`);
  revalidatePath(`/repairs/${update.ticketId}`);
  revalidatePath("/track");
  return { success: true };
}

export async function deleteStatusUpdate(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const updateId = formData.get("updateId");
  if (typeof updateId !== "string" || !updateId) {
    return { error: "Invalid request." };
  }

  const update = await prisma.statusUpdate.findUnique({
    where: { id: updateId },
    select: { id: true, ticketId: true },
  });
  if (!update) return { error: "Timeline entry not found." };

  // Removes only the timeline entry — the ticket's current status is
  // stored on the ticket itself and is not affected.
  await prisma.statusUpdate.delete({ where: { id: update.id } });

  revalidatePath(`/admin/tickets/${update.ticketId}`);
  revalidatePath(`/repairs/${update.ticketId}`);
  revalidatePath("/track");
  return { success: true };
}

// ── Admin: status pipeline updates ───────────────────────────────

const updateStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(TICKET_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

// Items logged by the Mark-as-Received dialog ("what did the customer hand
// over?") — phone, SIM, back cover…, each with an optional short detail.
const receivedItemsSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(60),
      detail: z
        .string()
        .trim()
        .max(120)
        .optional()
        .or(z.literal(""))
        .transform((v) => v || undefined),
    }),
  )
  .max(20);

export async function updateTicketStatus(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Not authorized." };
  }

  const parsed = updateStatusSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: "Invalid status update." };

  const { ticketId, status, note } = parsed.data;
  const ticket = await prisma.repairTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      status: true,
      ticketNumber: true,
      customerId: true,
      completedAt: true,
      brand: true,
      model: true,
      issueTitle: true,
      customer: { select: { name: true, email: true } },
    },
  });
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === status) return { error: "Ticket is already in this status." };

  // Items handed over with the device — only sent by the Mark-as-Received
  // dialog, so they're ignored for any other transition.
  let receivedItems: ReceivedItem[] = [];
  if (status === "RECEIVED") {
    const rawItems = formData.get("receivedItemsJson");
    if (typeof rawItems === "string" && rawItems) {
      let json: unknown;
      try {
        json = JSON.parse(rawItems);
      } catch {
        return { error: "Couldn't read the received items." };
      }
      const itemsParsed = receivedItemsSchema.safeParse(json);
      if (!itemsParsed.success) {
        return { error: "One or more received items are invalid." };
      }
      receivedItems = itemsParsed.data;
    }
  }
  const itemsNote = receivedItemsNote(receivedItems);

  // Optional image attached to this entry — e.g. a handover photo when the
  // device is collected. Best-effort: a failed/oversized upload is surfaced.
  let photoUrl: string | null = null;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const uploaded = await saveUploads([photoFile], "tickets", 1);
    if (uploaded.error) return { error: uploaded.error };
    photoUrl = uploaded.urls?.[0] ?? null;
  }

  // Context so the pickup note names the device and the shop's collection
  // details in the notification + email the customer receives.
  const shopInfo = await getShopInfo();
  const joinedDevice = [ticket.brand, ticket.model].filter(Boolean).join(" ");
  const hasDevice = joinedDevice.length > 0;
  const deviceName = joinedDevice || "device";
  const milestoneCtx = {
    deviceName: joinedDevice || undefined,
    location: shopInfo.address,
    hours: shopInfo.hours,
  };

  // Human-readable copy shared by the in-app notification and the email:
  // "Your iPhone 13 (REP-044) is diagnosed." Marking a repair COMPLETED means
  // it's ready for pickup, so — absent a custom note — the customer gets the
  // full "come and collect" message even though the timeline entry itself
  // keeps a plain "repair done" note.
  const headline = statusHeadline(status as TicketStatus);
  const defaultMessage =
    status === "COMPLETED"
      ? pickupNote(milestoneCtx)
      : milestoneDescription(status as TicketStatus, milestoneCtx);
  const message = note || itemsNote || defaultMessage;
  const notifTitle = `Your ${deviceName} (${ticket.ticketNumber}) is ${headline}`;
  const notifBody =
    !note && ticket.issueTitle ? `${message} · Issue: ${ticket.issueTitle}` : message;

  // Reaching any done status marks the repair completed — statuses often
  // jump straight to READY_FOR_PICKUP without passing through COMPLETED.
  const becameDone =
    DONE_TICKET_STATUSES.includes(status as TicketStatus) &&
    !DONE_TICKET_STATUSES.includes(ticket.status);

  await prisma.$transaction(async (tx) => {
    await tx.repairTicket.update({
      where: { id: ticketId },
      data: {
        status: status as TicketStatus,
        ...(receivedItems.length > 0 ? { receivedItems } : {}),
        ...(becameDone && !ticket.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
    });
    await tx.statusUpdate.create({
      data: {
        ticketId,
        status: status as TicketStatus,
        note: note || itemsNote || null,
        photo: photoUrl,
      },
    });
    if (ticket.customerId) {
      await syncCompletedRepairs(tx, ticket.customerId);
      await tx.notification.create({
        data: {
          userId: ticket.customerId,
          title: notifTitle,
          body: notifBody,
          href: `/repairs/${ticketId}`,
        },
      });
    }
  });

  // Email is best-effort — sendEmail never throws and no-ops when
  // RESEND_API_KEY isn't configured.
  if (ticket.customer?.email) {
    await sendEmail({
      to: ticket.customer.email,
      subject: notifTitle,
      heading: `Your ${deviceName} is ${headline}.`,
      details: [
        { label: "Repair", value: ticket.ticketNumber },
        { label: "Device", value: hasDevice ? deviceName : "" },
        { label: "Issue", value: ticket.issueTitle },
        { label: "Status", value: doneLabel(status as TicketStatus) },
      ],
      lines: [`Hi ${ticket.customer.name},`, message],
      cta: {
        label: "Track your repair",
        url: `${SITE_URL}/repairs/${ticketId}`,
      },
    });
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/admin");
  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Admin: delete a repair record ────────────────────────────────

export async function deleteTicket(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const ticketId = formData.get("ticketId");
  if (typeof ticketId !== "string") return { error: "Invalid ticket." };

  const ticket = await prisma.repairTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, ticketNumber: true, customerId: true },
  });
  if (!ticket) return { error: "Ticket not found." };

  await prisma.$transaction(async (tx) => {
    await tx.repairTicket.delete({ where: { id: ticketId } });
    if (ticket.customerId) {
      await syncCompletedRepairs(tx, ticket.customerId);
    }
  });

  revalidatePath("/admin/tickets");
  revalidatePath("/admin");
  revalidatePath("/admin/notes");
  redirect("/admin/tickets");
}

// ── Issue during repair (damage/dispute flow) ────────────────────
//
// The shop reports that something went wrong while the device was in its
// hands ("we cracked the back glass"), together with an optional fix it can
// do free of charge. The customer then decides:
//   accept + fix exists  → repair continues at no extra charge
//   decline (or no fix)  → repair is cancelled with a refund for the damage
// An admin can record the decision on the customer's behalf (walk-ins,
// phone calls).

const reportIssueSchema = z.object({
  ticketId: z.string().min(1),
  note: z
    .string()
    .trim()
    .min(5, "Describe what happened (at least 5 characters).")
    .max(2000),
  solution: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

export async function reportRepairIssue(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const parsed = reportIssueSchema.safeParse({
    ticketId: formData.get("ticketId"),
    note: formData.get("note"),
    solution: formData.get("solution"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { ticketId, note, solution } = parsed.data;

  const ticket = await prisma.repairTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      status: true,
      ticketNumber: true,
      customerId: true,
      brand: true,
      model: true,
      issueStatus: true,
      customer: { select: { name: true, email: true } },
    },
  });
  if (!ticket) return { error: "Ticket not found." };
  if (!ISSUE_REPORTABLE_STATUSES.includes(ticket.status)) {
    return { error: "Issues can only be reported while the device is at the shop." };
  }
  if (ticket.issueStatus === "PENDING") {
    return { error: "An issue is already awaiting the customer's decision." };
  }

  const deviceName = [ticket.brand, ticket.model].filter(Boolean).join(" ") || "device";
  const decisionLine = solution
    ? `We can fix it free of charge: ${solution} — accept to continue, or decline to cancel the repair with a refund for the damage.`
    : "Unfortunately there is no way to fix this. We're sorry — we'll cancel the repair and refund you for the damage.";

  await prisma.$transaction(async (tx) => {
    await tx.repairTicket.update({
      where: { id: ticketId },
      data: {
        issueStatus: "PENDING",
        issueNote: note,
        issueSolution: solution ?? null,
        issueReportedAt: new Date(),
        issueResolvedAt: null,
        refunded: false,
      },
    });
    if (ticket.customerId) {
      await tx.notification.create({
        data: {
          userId: ticket.customerId,
          title: `Issue with your ${deviceName} (${ticket.ticketNumber}) — your decision needed`,
          body: `${note} ${decisionLine}`,
          href: `/repairs/${ticketId}`,
        },
      });
    }
  });

  if (ticket.customer?.email) {
    await sendEmail({
      to: ticket.customer.email,
      subject: `Issue with your ${deviceName} (${ticket.ticketNumber}) — your decision needed`,
      heading: `An issue occurred with your ${deviceName}.`,
      details: [
        { label: "Repair", value: ticket.ticketNumber },
        { label: "What happened", value: note },
        ...(solution
          ? [{ label: "Proposed fix (free of charge)", value: solution }]
          : []),
      ],
      lines: [
        `Hi ${ticket.customer.name},`,
        `While working on your ${deviceName}, something went wrong on our side: ${note}`,
        decisionLine,
        "Please open your repair page to make your choice.",
      ],
      cta: { label: "Review & decide", url: `${SITE_URL}/repairs/${ticketId}` },
    });
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

const respondIssueSchema = z.object({
  ticketId: z.string().min(1),
  decision: z.enum(["accept", "decline"]),
});

export async function respondRepairIssue(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authorized." };

  const parsed = respondIssueSchema.safeParse({
    ticketId: formData.get("ticketId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return { error: "Invalid request." };
  const { ticketId, decision } = parsed.data;

  const ticket = await prisma.repairTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      status: true,
      ticketNumber: true,
      customerId: true,
      brand: true,
      model: true,
      issueStatus: true,
      issueNote: true,
      issueSolution: true,
    },
  });
  if (!ticket) return { error: "Ticket not found." };

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && ticket.customerId !== session.user.id) {
    return { error: "Not authorized." };
  }
  if (ticket.issueStatus !== "PENDING") {
    return { error: "This issue has already been decided." };
  }

  const deviceName = [ticket.brand, ticket.model].filter(Boolean).join(" ") || "device";
  // "Accept" only continues the repair when there IS a fix to accept —
  // with no fix on the table, the only outcome is cancellation + refund.
  const continueRepair = decision === "accept" && !!ticket.issueSolution;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (continueRepair) {
    await prisma.$transaction(async (tx) => {
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: { issueStatus: "ACCEPTED", issueResolvedAt: new Date() },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: `${ticket.ticketNumber}: customer accepted the free fix — continue the repair`,
            body: ticket.issueSolution ?? "",
            href: `/admin/tickets/${ticketId}`,
          })),
        });
      }
      if (ticket.customerId) {
        await tx.notification.create({
          data: {
            userId: ticket.customerId,
            title: `We're fixing the issue on your ${deviceName} (${ticket.ticketNumber}) — free of charge`,
            body: "Thanks for your patience — the repair continues at no extra cost to you.",
            href: `/repairs/${ticketId}`,
          },
        });
      }
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: {
          issueStatus: "DECLINED",
          issueResolvedAt: new Date(),
          refunded: true,
          status: "CANCELLED",
        },
      });
      await tx.statusUpdate.create({
        data: {
          ticketId,
          status: "CANCELLED",
          note: `Cancelled due to an issue during the repair — a refund for the damage will be issued.${
            ticket.issueNote ? ` Issue: ${ticket.issueNote}` : ""
          }`.slice(0, 500),
        },
      });
      if (ticket.customerId) {
        await syncCompletedRepairs(tx, ticket.customerId);
        await tx.notification.create({
          data: {
            userId: ticket.customerId,
            title: `Your ${deviceName} (${ticket.ticketNumber}) repair was cancelled — refund on its way`,
            body: "We're sorry about the issue. We'll refund you for the damage.",
            href: `/repairs/${ticketId}`,
          },
        });
      }
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: `${ticket.ticketNumber}: repair cancelled over the issue — refund the customer`,
            body: ticket.issueNote ?? "",
            href: `/admin/tickets/${ticketId}`,
          })),
        });
      }
    });
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/admin");
  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/dashboard");
  revalidatePath("/track");
  return { success: true };
}
