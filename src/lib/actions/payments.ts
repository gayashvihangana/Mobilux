"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/config";
import { applyDiscount, discountForCount } from "@/lib/loyalty";
import { formatLKR } from "@/lib/utils";

export type PaymentFormState = {
  error?: string;
  success?: boolean;
} | null;

const OPEN_PAYMENT_STATUSES = ["PENDING", "PENDING_VERIFICATION", "PAID"] as const;

async function notifyAdmins(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  title: string,
  body: string,
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length > 0) {
    await tx.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title,
        body,
        href: "/admin/payments",
      })),
    });
  }
}

export async function submitReceipt(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = z
    .object({
      ticketId: z.string().min(1).optional(),
      orderId: z.string().min(1).optional(),
      reference: z.string().trim().max(100).optional().or(z.literal("")),
    })
    .refine((v) => !!v.ticketId !== !!v.orderId, "one target required")
    .safeParse({
      ticketId: formData.get("ticketId") ?? undefined,
      orderId: formData.get("orderId") ?? undefined,
      reference: formData.get("reference"),
    });
  if (!parsed.success) return { error: "Invalid submission." };

  const { ticketId, orderId, reference } = parsed.data;

  // Resolve what is being paid and how much
  let amount: number;
  let discountPercent = 0;
  let label: string;

  if (ticketId) {
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
    const rules = await prisma.discountRule.findMany({ where: { active: true } });
    discountPercent = discountForCount(
      rules,
      ticket.customer?.completedRepairs ?? 0,
    );
    amount = applyDiscount(Number(ticket.finalCost), discountPercent);
    label = ticket.ticketNumber;
  } else {
    const order = await prisma.order.findUnique({
      where: { id: orderId! },
      include: {
        payments: {
          where: { status: { in: [...OPEN_PAYMENT_STATUSES] } },
          select: { id: true },
        },
      },
    });
    if (!order || order.userId !== session.user.id) {
      return { error: "Order not found." };
    }
    if (order.status !== "PENDING") {
      return { error: "This order is not awaiting payment." };
    }
    if (order.payments.length > 0) {
      return { error: "A payment for this order is already submitted or paid." };
    }
    amount = Number(order.total);
    label = order.orderNumber;
  }

  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) {
    return { error: "Please attach your bank transfer receipt." };
  }
  const uploaded = await saveUploads([receipt], "receipts", 1);
  if (uploaded.error || !uploaded.urls?.length) {
    return { error: uploaded.error ?? "Could not save the receipt." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        userId: session.user.id,
        ticketId: ticketId ?? null,
        orderId: orderId ?? null,
        amount,
        method: "BANK_TRANSFER",
        status: "PENDING_VERIFICATION",
        receiptUrl: uploaded.urls![0],
        reference: reference || null,
      },
    });
    if (ticketId) {
      await tx.repairTicket.update({
        where: { id: ticketId },
        data: { discountPercent },
      });
    }
    await notifyAdmins(
      tx,
      `Receipt uploaded for ${label}`,
      `${formatLKR(amount)} bank transfer awaiting verification.`,
    );
  });

  if (ticketId) revalidatePath(`/repairs/${ticketId}`);
  if (orderId) revalidatePath(`/orders/${orderId}`);
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
    include: {
      ticket: { select: { id: true, ticketNumber: true } },
      order: { select: { id: true, orderNumber: true, status: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!payment) return { error: "Payment not found." };
  if (payment.status !== "PENDING_VERIFICATION") {
    return { error: "This payment has already been reviewed." };
  }

  const verified = outcome === "PAID";
  const label =
    payment.ticket?.ticketNumber ?? payment.order?.orderNumber ?? "payment";
  const customerHref = payment.ticket
    ? `/repairs/${payment.ticket.id}`
    : payment.order
      ? `/orders/${payment.order.id}`
      : "/dashboard";

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: outcome,
        adminNote: parsed.data.adminNote || null,
        verifiedAt: verified ? new Date() : null,
      },
    });
    if (verified && payment.order && payment.order.status === "PENDING") {
      await tx.order.update({
        where: { id: payment.order.id },
        data: { status: "PAID" },
      });
    }
    await tx.notification.create({
      data: {
        userId: payment.userId,
        title: verified
          ? `Payment confirmed — ${label}`
          : `Payment could not be verified — ${label}`,
        body: verified
          ? `We received your ${formatLKR(payment.amount.toString())} transfer. Thank you!`
          : parsed.data.adminNote ||
            "Please check your receipt and try again, or contact us.",
        href: customerHref,
      },
    });
  });

  await sendEmail({
    to: payment.user.email,
    subject: verified
      ? `Payment confirmed — ${label}`
      : `Payment could not be verified — ${label}`,
    heading: verified ? "Payment confirmed" : "Payment needs another look",
    lines: [
      `Hi ${payment.user.name},`,
      verified
        ? `We received your ${formatLKR(payment.amount.toString())} bank transfer for ${label}. Thank you!`
        : parsed.data.adminNote ||
          `We couldn't verify your ${formatLKR(payment.amount.toString())} transfer for ${label}. Please check your receipt and try again, or contact us.`,
    ],
    cta: { label: "View details", url: `${SITE_URL}${customerHref}` },
  });

  if (payment.ticket) {
    revalidatePath(`/repairs/${payment.ticket.id}`);
    revalidatePath(`/admin/tickets/${payment.ticket.id}`);
  }
  if (payment.order) {
    revalidatePath(`/orders/${payment.order.id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/orders");
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
