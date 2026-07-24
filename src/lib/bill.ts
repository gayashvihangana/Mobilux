import type { TicketStatus } from "@prisma/client";
import { BANK_DETAILS } from "@/lib/config";

// One line on the itemised bill, e.g. { label: "Battery", amount: 4500 }.
export type BillLineItem = { label: string; amount: number };

// A human invoice number derived from the repair's ticket number, so the bill
// can show both a distinct "Invoice No." and the underlying "Repair ID"
// (the ticket number the shop already uses everywhere else).
export function invoiceNumber(ticketNumber: string): string {
  const digits = ticketNumber.replace(/\D/g, "");
  return digits ? `INV-${digits}` : `INV-${ticketNumber}`;
}

// The Colombo calendar Y/M/D of an instant — so warranty dates are computed
// against the same day the customer sees as the invoice date.
function colomboYMD(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

// The day a warranty runs out, given a start date and a free-text period like
// "3 months", "30 days", "1 year". The bill labels the end as 11:59 PM that
// day (the whole last day is covered). Returns null when the period can't be
// parsed. Anchored at noon UTC so formatting back to Colombo keeps the day.
export function warrantyEndDate(start: Date, period: string | null): Date | null {
  const m = period?.trim().match(/(\d+)\s*(day|week|month|year)s?/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!(n > 0)) return null;

  const { y, m: mon, d } = colomboYMD(start);
  const dt = new Date(Date.UTC(y, mon - 1, d, 12, 0, 0));
  const unit = m[2].toLowerCase();
  if (unit === "day") dt.setUTCDate(dt.getUTCDate() + n);
  else if (unit === "week") dt.setUTCDate(dt.getUTCDate() + n * 7);
  else if (unit === "month") dt.setUTCMonth(dt.getUTCMonth() + n);
  else if (unit === "year") dt.setUTCFullYear(dt.getUTCFullYear() + n);
  return dt;
}

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
  billGeneratedAt: Date | null;
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
  warrantyEnd: Date | null;
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
  // Invoice date = when the bill was generated (frozen at generation time),
  // falling back to completion/creation for bills made before this existed.
  const billDate =
    ticket.billGeneratedAt ?? ticket.completedAt ?? ticket.createdAt;
  const warrantyEnd = warrantyEndDate(billDate, ticket.warrantyPeriod);

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
      warrantyEnd,
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
    warrantyEnd,
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
