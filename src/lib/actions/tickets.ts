"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TicketStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";
import { STATUS_META } from "@/lib/status";

export type TicketFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

const createTicketSchema = z.object({
  deviceType: z.enum(["PHONE", "TABLET", "LAPTOP", "SMARTWATCH", "OTHER"]),
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
    const created = await tx.repairTicket.create({
      data: {
        ...parsed.data,
        customerId: session.user.id,
        photos: uploaded.urls ?? [],
        ticketNumber: `TMP-${crypto.randomUUID()}`,
      },
    });
    const ticketNumber = `MBX-${String(created.seq).padStart(4, "0")}`;
    const updated = await tx.repairTicket.update({
      where: { id: created.id },
      data: { ticketNumber },
    });
    await tx.statusUpdate.create({
      data: {
        ticketId: created.id,
        status: "RECEIVED",
        note: "Repair request submitted. We'll begin diagnosis shortly.",
      },
    });
    return updated;
  });

  // Notify all admins about the new request
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: `New repair request ${ticket.ticketNumber}`,
        body: `${parsed.data.brand} ${parsed.data.model} — ${parsed.data.issueTitle}`,
        href: `/admin/tickets/${ticket.id}`,
      })),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect(`/repairs/${ticket.id}?created=1`);
}

const updateStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum([
    "RECEIVED",
    "DIAGNOSING",
    "AWAITING_PARTS",
    "IN_PROGRESS",
    "COMPLETED",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "CANCELLED",
  ]),
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
    select: { id: true, status: true, ticketNumber: true, customerId: true },
  });
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === status) return { error: "Ticket is already in this status." };

  const becameCompleted =
    status === "COMPLETED" && ticket.status !== "COMPLETED";

  await prisma.$transaction(async (tx) => {
    await tx.repairTicket.update({
      where: { id: ticketId },
      data: {
        status: status as TicketStatus,
        ...(becameCompleted ? { completedAt: new Date() } : {}),
      },
    });
    await tx.statusUpdate.create({
      data: { ticketId, status: status as TicketStatus, note: note || null },
    });
    if (becameCompleted) {
      await tx.user.update({
        where: { id: ticket.customerId },
        data: { completedRepairs: { increment: 1 } },
      });
    }
    await tx.notification.create({
      data: {
        userId: ticket.customerId,
        title: `${ticket.ticketNumber} — ${STATUS_META[status as TicketStatus].label}`,
        body:
          note || STATUS_META[status as TicketStatus].description,
        href: `/repairs/${ticketId}`,
      },
    });
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/admin");
  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

const costsSchema = z.object({
  ticketId: z.string().min(1),
  estimatedCost: z.coerce.number().min(0).optional(),
  finalCost: z.coerce.number().min(0).optional(),
  adminNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function updateTicketCosts(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Not authorized." };
  }

  const raw = {
    ticketId: formData.get("ticketId"),
    estimatedCost: formData.get("estimatedCost") || undefined,
    finalCost: formData.get("finalCost") || undefined,
    adminNotes: formData.get("adminNotes"),
  };
  const parsed = costsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid values." };

  const { ticketId, estimatedCost, finalCost, adminNotes } = parsed.data;
  await prisma.repairTicket.update({
    where: { id: ticketId },
    data: {
      estimatedCost: estimatedCost ?? null,
      finalCost: finalCost ?? null,
      adminNotes: adminNotes || null,
    },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/repairs/${ticketId}`);
  return { success: true };
}
