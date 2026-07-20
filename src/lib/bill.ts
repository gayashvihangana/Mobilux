import type { TicketStatus } from "@prisma/client";
import { WARRANTY_DAYS } from "@/lib/config";

export type BillTicket = {
  id: string;
  ticketNumber: string;
  brand: string | null;
  model: string | null;
  issueTitle: string;
  solution: string | null;
  status: TicketStatus;
  createdAt: Date;
  completedAt: Date | null;
  finalCost: string | null;
  estimatedCost: string | null;
  paidAmount: string | null;
  discountPercent: string | null;
  partsUsed: string | null;
  billNotes: string | null;
  customerName: string | null;
  customer: { name: string; email: string; phone: string | null } | null;
  paidPayment: { amount: string; createdAt: Date } | null;
};

export type BillTotals = {
  deviceName: string;
  owner: string;
  billDate: Date;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  isSettled: boolean;
  warrantyExpiry: Date | null;
};

// Single source of truth for bill math — the on-screen bill and the
// downloaded PDF must always show identical figures.
export function computeBill(ticket: BillTicket): BillTotals {
  const deviceName =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") || "Device";
  const owner = ticket.customer?.name ?? ticket.customerName ?? "Customer";
  const billDate = ticket.completedAt ?? ticket.createdAt;

  const finalCost = ticket.finalCost ? Number(ticket.finalCost) : null;
  const discountPercent = ticket.discountPercent
    ? Number(ticket.discountPercent)
    : 0;

  // Prefer a verified online payment; otherwise fall back to the
  // shop's own paid-amount record; otherwise the quoted price.
  const paid = ticket.paidPayment
    ? Number(ticket.paidPayment.amount)
    : ticket.paidAmount !== null
      ? Number(ticket.paidAmount)
      : null;
  const isSettled = paid !== null;

  const subtotal =
    finalCost ?? paid ?? (ticket.estimatedCost ? Number(ticket.estimatedCost) : 0);
  const discountAmount =
    discountPercent > 0 && finalCost !== null
      ? Math.round(finalCost * (discountPercent / 100) * 100) / 100
      : 0;
  const total = paid ?? subtotal - discountAmount;

  const warrantyExpiry = ticket.completedAt
    ? new Date(
        ticket.completedAt.getTime() + WARRANTY_DAYS * 24 * 60 * 60 * 1000,
      )
    : null;

  return {
    deviceName,
    owner,
    billDate,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    isSettled,
    warrantyExpiry,
  };
}
