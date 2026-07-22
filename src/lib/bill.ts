import type { TicketStatus } from "@prisma/client";
import { BANK_DETAILS } from "@/lib/config";

// One line on the itemised bill, e.g. { label: "Battery", amount: 4500 }.
export type BillLineItem = { label: string; amount: number };

// Where the customer should pay — shown on unpaid invoices. Any field left
// blank falls back to the shop default in config (BANK_DETAILS).
export type BillPayTo = {
  bankName?: string;
  branch?: string;
  accountName?: string;
  accountNumber?: string;
};

// Per-field visibility toggles — the admin decides what prints on the bill.
export type BillShow = {
  device: boolean;
  status: boolean;
  issue: boolean;
  solution: boolean;
  technician: boolean;
  warranty: boolean;
  notes: boolean;
  payment: boolean;
  track: boolean;
};

export const DEFAULT_BILL_SHOW: BillShow = {
  device: true,
  status: true,
  issue: true,
  solution: true,
  technician: true,
  warranty: false,
  notes: true,
  payment: true,
  track: true,
};

export function resolveBillShow(raw: unknown): BillShow {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BILL_SHOW };
  const r = raw as Record<string, unknown>;
  const out = { ...DEFAULT_BILL_SHOW };
  for (const key of Object.keys(DEFAULT_BILL_SHOW) as (keyof BillShow)[]) {
    if (typeof r[key] === "boolean") out[key] = r[key] as boolean;
  }
  return out;
}

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
  // Admin-built itemised bill (see computeBill). When billItems is a
  // non-empty array the bill renders these rows instead of the single line.
  technician: string | null;
  billItems: BillLineItem[] | null;
  billDiscountPercent: string | null;
  billDiscountAmount: string | null;
  billPayTo: BillPayTo | null;
  paidAt: Date | null;
  paidMethod: string | null;
  warrantyPeriod: string | null;
  warrantyParts: string | null;
  billShow: BillShow | null;
  customer: { name: string; email: string; phone: string | null } | null;
  paidPayment: { amount: string; createdAt: Date } | null;
};

export type BillTotals = {
  deviceName: string;
  owner: string;
  technician: string | null;
  billDate: Date;
  // When true, render `items` as separate rows with a subtotal; otherwise
  // the legacy single-line layout (solution + parts subtext).
  isItemized: boolean;
  items: BillLineItem[];
  subtotal: number;
  discountLabel: string;
  discountAmount: number;
  total: number;
  isSettled: boolean;
  paidDate: Date | null;
  paidMethod: string | null;
  // Resolved bank details to print in the "How to pay" block (unpaid only).
  payTo: Required<BillPayTo>;
  // Per-field visibility toggles.
  show: BillShow;
};

// Normalises whatever is stored in the billItems JSON column into a clean
// array of well-formed line items (label present, amount a finite number).
function normaliseItems(raw: BillTicket["billItems"]): BillLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (i): i is BillLineItem =>
        !!i && typeof i.label === "string" && i.label.trim().length > 0,
    )
    .map((i) => ({
      label: i.label.trim(),
      amount: Number.isFinite(Number(i.amount)) ? Number(i.amount) : 0,
    }));
}

// Per-bill overrides win; blanks fall back to the shop default.
function resolvePayTo(override: BillPayTo | null): Required<BillPayTo> {
  const o = override ?? {};
  return {
    bankName: o.bankName?.trim() || BANK_DETAILS.bankName,
    branch: o.branch?.trim() || BANK_DETAILS.branch,
    accountName: o.accountName?.trim() || BANK_DETAILS.accountName,
    accountNumber: o.accountNumber?.trim() || BANK_DETAILS.accountNumber,
  };
}

// Single source of truth for bill math — the on-screen bill and the
// downloaded PDF must always show identical figures.
export function computeBill(ticket: BillTicket): BillTotals {
  const deviceName =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") || "Device";
  const owner = ticket.customer?.name ?? ticket.customerName ?? "Customer";
  const billDate = ticket.completedAt ?? ticket.createdAt;

  // Prefer a verified online payment; otherwise fall back to the
  // shop's own paid-amount record; otherwise the quoted price.
  const paid = ticket.paidPayment
    ? Number(ticket.paidPayment.amount)
    : ticket.paidAmount !== null
      ? Number(ticket.paidAmount)
      : null;
  const isSettled = paid !== null;
  const paidDate = isSettled
    ? (ticket.paidPayment?.createdAt ?? ticket.paidAt ?? null)
    : null;
  const paidMethod = isSettled
    ? (ticket.paidMethod ?? (ticket.paidPayment ? "Bank transfer" : null))
    : null;
  const payTo = resolvePayTo(ticket.billPayTo);
  const show = resolveBillShow(ticket.billShow);

  const items = normaliseItems(ticket.billItems);

  // ── Itemised bill (admin-built) ────────────────────────────────
  // The admin's explicit line items + discount define the bill total;
  // the loyalty discountPercent is intentionally ignored on this path.
  if (items.length > 0) {
    const subtotal =
      Math.round(items.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;

    const fixed = ticket.billDiscountAmount
      ? Number(ticket.billDiscountAmount)
      : 0;
    const pct = ticket.billDiscountPercent
      ? Number(ticket.billDiscountPercent)
      : 0;

    let discountAmount = 0;
    let discountLabel = "";
    if (fixed > 0) {
      discountAmount = Math.min(Math.round(fixed * 100) / 100, subtotal);
      discountLabel = "Discount";
    } else if (pct > 0) {
      discountAmount = Math.round(subtotal * (pct / 100) * 100) / 100;
      discountLabel = `Discount (${pct}%)`;
    }

    return {
      deviceName,
      owner,
      technician: ticket.technician,
      billDate,
      isItemized: true,
      items,
      subtotal,
      discountLabel,
      discountAmount,
      total: Math.round((subtotal - discountAmount) * 100) / 100,
      isSettled,
      paidDate,
      paidMethod,
      payTo,
      show,
    };
  }

  // ── Legacy single-line bill (auto-computed from ticket fields) ──
  const finalCost = ticket.finalCost ? Number(ticket.finalCost) : null;
  const discountPercent = ticket.discountPercent
    ? Number(ticket.discountPercent)
    : 0;

  const subtotal =
    finalCost ?? paid ?? (ticket.estimatedCost ? Number(ticket.estimatedCost) : 0);
  const discountAmount =
    discountPercent > 0 && finalCost !== null
      ? Math.round(finalCost * (discountPercent / 100) * 100) / 100
      : 0;
  const total = paid ?? subtotal - discountAmount;

  return {
    deviceName,
    owner,
    technician: ticket.technician,
    billDate,
    isItemized: false,
    items: [],
    subtotal,
    discountLabel:
      discountAmount > 0 ? `Loyalty discount (${discountPercent}%)` : "",
    discountAmount,
    total,
    isSettled,
    paidDate,
    paidMethod,
    payTo,
    show,
  };
}
