"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";
import { applyDiscount, discountForCount } from "@/lib/loyalty";
import { formatLKR } from "@/lib/utils";

export type PaymentFormState = {
  error?: string;
  success?: boolean;
} | null;

const OPEN_PAYMENT_STATUSES = ["PENDING", "PENDING_VERIFICATION", "PAID"] as const;

export async function submitReceipt(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = z
    .object({
      ticketId: z.string().min(1),
      reference: z.string().trim().max(100).optional().or(z.literal("")),
    })
    .safeParse({
      ticketId: formData.get("ticketId"),
      reference: formData.get("reference"),
    });
  if (!parsed.success) return { error: "Invalid submission." };

  const { ticketId, reference } = parsed.data;

  const ticket = await prisma.repairTicket.findUnique({
    where: { id: ticketId },
    include: {
      payments: {
        where: { status: { in: [...OPEN_PAYMENT_STATUSES] } },
        select: { id: true },
      },
      customer: { select: { completedRepairs: true } },
    },
  });
  if (!ticket || ticket.customerId !== session.user.id) {
    return { error: "Ticket not found." };
  }
  if (!ticket.finalCost) {
    return { error: "The final price hasn't been confirmed yet." };
  }
  if (ticket.payments.length > 0) {
    return { error: "A payment for this repair is already submitted or paid." };
  }

  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) {
    return { error: "Please attach your bank transfer receipt." };
  }
  const uploaded = await saveUploads([receipt], "receipts", 1);
  if (uploaded.error || !uploaded.urls?.length) {
    return { error: uploaded.error ?? "Could not save the receipt." };
  }

  const rules = await prisma.discountRule.findMany({ where: { active: true } });
  const discountPercent = discountForCount(
    rules,
    ticket.customer.completedRepairs,
  );
  const amount = applyDiscount(Number(ticket.finalCost), discountPercent);

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        userId: session.user.id,
        ticketId,
        amount,
        method: "BANK_TRANSFER",
        status: "PENDING_VERIFICATION",
        receiptUrl: uploaded.urls![0],
        reference: reference || null,
      },
    });
    await tx.repairTicket.update({
      where: { id: ticketId },
      data: { discountPercent },
    });
    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: `Receipt uploaded for ${ticket.ticketNumber}`,
          body: `${formatLKR(amount)} bank transfer awaiting verification.`,
          href: "/admin/payments",
        })),
      });
    }
  });

  revalidatePath(`/repairs/${ticketId}`);
  revalidatePath("/admin/payments");
  return { success: true };
}

const reviewSchema = z.object({
  paymentId: z.string().min(1),
  adminNote: z.string().trim().max(500).optional().or(z.literal("")),
});

async function reviewPayment(
  formData: FormData,
  outcome: "PAID" | "REJECTED",
): Promise<PaymentFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const parsed = reviewSchema.safeParse({
    paymentId: formData.get("paymentId"),
    adminNote: formData.get("adminNote"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const payment = await prisma.payment.findUnique({
    where: { id: parsed.data.paymentId },
    include: { ticket: { select: { id: true, ticketNumber: true } } },
  });
  if (!payment) return { error: "Payment not found." };
  if (payment.status !== "PENDING_VERIFICATION") {
    return { error: "This payment has already been reviewed." };
  }

  const verified = outcome === "PAID";
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: outcome,
        adminNote: parsed.data.adminNote || null,
        verifiedAt: verified ? new Date() : null,
      },
    });
    await tx.notification.create({
      data: {
        userId: payment.userId,
        title: verified
          ? `Payment confirmed — ${payment.ticket?.ticketNumber ?? "order"}`
          : `Payment could not be verified — ${payment.ticket?.ticketNumber ?? "order"}`,
        body: verified
          ? `We received your ${formatLKR(payment.amount.toString())} transfer. Thank you!`
          : parsed.data.adminNote ||
            "Please check your receipt and try again, or contact us.",
        href: payment.ticket ? `/repairs/${payment.ticket.id}` : "/dashboard",
      },
    });
  });

  if (payment.ticket) {
    revalidatePath(`/repairs/${payment.ticket.id}`);
    revalidatePath(`/admin/tickets/${payment.ticket.id}`);
  }
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return { success: true };
}

export async function verifyPayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  return reviewPayment(formData, "PAID");
}

export async function rejectPayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  return reviewPayment(formData, "REJECTED");
}
