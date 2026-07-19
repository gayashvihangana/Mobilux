"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TicketStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/config";
import { STATUS_META } from "@/lib/status";
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

// ── Admin: status pipeline updates ───────────────────────────────

const updateStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(TICKET_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

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
      customer: { select: { name: true, email: true } },
    },
  });
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === status) return { error: "Ticket is already in this status." };

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
        ...(becameDone && !ticket.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
    });
    await tx.statusUpdate.create({
      data: { ticketId, status: status as TicketStatus, note: note || null },
    });
    if (ticket.customerId) {
      await syncCompletedRepairs(tx, ticket.customerId);
      await tx.notification.create({
        data: {
          userId: ticket.customerId,
          title: `${ticket.ticketNumber} — ${STATUS_META[status as TicketStatus].label}`,
          body: note || STATUS_META[status as TicketStatus].description,
          href: `/repairs/${ticketId}`,
        },
      });
    }
  });

  // Email is best-effort — sendEmail never throws and no-ops when
  // RESEND_API_KEY isn't configured.
  if (ticket.customer?.email) {
    const meta = STATUS_META[status as TicketStatus];
    const device = [ticket.brand, ticket.model].filter(Boolean).join(" ");
    await sendEmail({
      to: ticket.customer.email,
      subject: `${ticket.ticketNumber} — ${meta.label}`,
      heading: `Your repair is now: ${meta.label}`,
      lines: [
        `Hi ${ticket.customer.name},`,
        note || meta.description,
        `Ticket ${ticket.ticketNumber}${device ? ` · ${device}` : ""}`,
      ],
      cta: {
        label: "View repair status",
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
