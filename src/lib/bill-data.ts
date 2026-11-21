import { prisma } from "@/lib/prisma";
import {
  parseBillPayments,
  resolveBillShow,
  type BillLineItem,
  type BillPayTo,
  type BillTicket,
} from "@/lib/bill";

// Shared by the bill page and the PDF download route so both always
// render from identical data.
export async function fetchBillTicket(
  id: string,
): Promise<{
  bill: BillTicket;
  customerId: string | null;
  trackToken: string;
  /** Parts and costs the shop paid: for the admin's profit line only. */
  partsCost: number;
} | null> {
  const ticket = await prisma.repairTicket.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      issues: { orderBy: { reportedAt: "asc" } },
      payments: {
        where: { status: "PAID" },
        orderBy: { createdAt: "asc" },
        select: { amount: true, createdAt: true },
      },
    },
  });
  if (!ticket) return null;

  return {
    customerId: ticket.customerId,
    // Drives the bill's QR code — the unguessable tracking link, not the
    // sequential ticket number.
    trackToken: ticket.trackToken,
    partsCost: ticket.partsCost ? Number(ticket.partsCost) : 0,
    bill: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      brand: ticket.brand,
      model: ticket.model,
      issueTitle: ticket.issueTitle,
      solution: ticket.solution,
      status: ticket.status,
      createdAt: ticket.createdAt,
      completedAt: ticket.completedAt,
      finalCost: ticket.finalCost?.toString() ?? null,
      estimatedCost: ticket.estimatedCost?.toString() ?? null,
      paidAmount: ticket.paidAmount?.toString() ?? null,
      discountPercent: ticket.discountPercent?.toString() ?? null,
      partsUsed: ticket.partsUsed,
      billNotes: ticket.billNotes,
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      technician: ticket.technician,
      billItems: (ticket.billItems as BillLineItem[] | null) ?? null,
      billDiscountPercent: ticket.billDiscountPercent?.toString() ?? null,
      billDiscountAmount: ticket.billDiscountAmount?.toString() ?? null,
      billPayTo: (ticket.billPayTo as BillPayTo | null) ?? null,
      billGeneratedAt: ticket.billGeneratedAt,
      paidAt: ticket.paidAt,
      paidMethod: ticket.paidMethod,
      billPayments: parseBillPayments(ticket.billPayments),
      warrantyPeriod: ticket.warrantyPeriod,
      warrantyParts: ticket.warrantyParts,
      issues: ticket.issues.map((issue) => ({
        note: issue.note,
        solution: issue.solution,
        status: issue.status,
        reportedAt: issue.reportedAt,
      })),
      issueWarranty: ticket.issueWarranty,
      // Null when the shop has never chosen a layout for this bill — the
      // builder then falls back to the saved shop-wide default. computeBill
      // resolves null to the built-in defaults on its own.
      billShow: ticket.billShow ? resolveBillShow(ticket.billShow) : null,
      customer: ticket.customer,
      onlinePayments: ticket.payments.map((p) => ({
        amount: p.amount.toString(),
        createdAt: p.createdAt,
      })),
    },
  };
}

// The customer's bill link (/invoice/[token]) finds the repair by its
// unguessable tracking token, never by id or ticket number.
export async function fetchBillByToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const ticket = await prisma.repairTicket.findUnique({
    where: { trackToken: trimmed },
    select: { id: true },
  });
  return ticket ? fetchBillTicket(ticket.id) : null;
}
