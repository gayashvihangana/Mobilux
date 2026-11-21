import type { RepairIssueStatus, TicketStatus } from "@prisma/client";
import { BANK_DETAILS } from "@/lib/config";

// One line on the itemised bill. `amount` is always the line total, so bills
// saved before quantities existed ({ label, amount }) still read correctly;
// newer lines also carry `qty` and `unitPrice` (amount = qty x unitPrice).
export type BillLineItem = {
  label: string;
  amount: number;
  qty?: number;
  unitPrice?: number;
};

// A payment the shop recorded by hand on the bill page (cash at the counter,
// a card, a transfer it checked itself). Stored oldest first in the ticket's
// `billPayments` JSON column; `paidAmount` is kept equal to their sum so the
// reports, Board and Today page keep reading one number.
export type BillPaymentEntry = {
  id: string;
  amount: number;
  method: string;
  /** ISO date-time string. */
  at: string;
  /** Who recorded it (staff name), for the admin list only. */
  by?: string | null;
};

export const PAYMENT_METHODS = ["Cash", "Card", "Bank transfer", "Other"] as const;

/** Reads the `billPayments` JSON column into clean entries (never throws). */
export function parseBillPayments(raw: unknown): BillPaymentEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const e = r as Record<string, unknown>;
    const amount = Number(e.amount);
    if (typeof e.id !== "string" || !(amount > 0)) return [];
    return [
      {
        id: e.id,
        amount: Math.round(amount * 100) / 100,
        method: typeof e.method === "string" ? e.method : "Other",
        at: typeof e.at === "string" ? e.at : new Date(0).toISOString(),
        by: typeof e.by === "string" ? e.by : null,
      },
    ];
  });
}

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
  /** The "issue during the repair" block — what happened and the free fix. */
  repairIssue: boolean;
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
  repairIssue: true,
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

// Something that went wrong at the shop while the device was in its hands,
// as printed on the bill: what happened, the fix done free of charge, and
// where the customer's decision landed.
export type BillIssue = {
  note: string;
  solution: string | null;
  status: RepairIssueStatus;
  reportedAt: Date;
};

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
  customerPhone: string | null;
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
  /** Payments recorded by hand on the bill page. */
  billPayments: BillPaymentEntry[];
  warrantyPeriod: string | null;
  warrantyParts: string | null;
  // Issue-during-repair block: the issues themselves come from the ticket
  // (so the bill can never disagree with what the customer was told), the
  // warranty line on the free fix is typed in the bill builder.
  issues: BillIssue[];
  issueWarranty: string | null;
  billShow: BillShow | null;
  customer: { name: string; email: string; phone: string | null } | null;
  /** Bank transfers the customer uploaded and the shop verified. */
  onlinePayments: { amount: string; createdAt: Date }[];
};

/** Where the bill is: nothing saved yet, saved and owed, part paid, paid. */
export type BillState = "draft" | "issued" | "partial" | "paid";

/** One row in the bill's payment list, whichever way the money came in. */
export type BillPaymentRow = {
  id: string;
  amount: number;
  method: string;
  at: Date;
  by: string | null;
  /** A verified online transfer: managed under Payments, not removable here. */
  online: boolean;
};

export type BillTotals = {
  deviceName: string;
  owner: string;
  technician: string | null;
  billDate: Date;
  warrantyEnd: Date | null;
  // When true, render `items` as separate rows with a subtotal; otherwise
  // the single line made from the repair (solution + parts subtext).
  isItemized: boolean;
  items: Required<BillLineItem>[];
  subtotal: number;
  discountLabel: string;
  discountAmount: number;
  total: number;
  /** Every payment, oldest first. */
  payments: BillPaymentRow[];
  paidTotal: number;
  /** What is still owed (never below zero). */
  balance: number;
  state: BillState;
  /** Paid in full: the bill reads as a receipt. */
  isSettled: boolean;
  /** When the last payment landed, once paid in full. */
  paidDate: Date | null;
  /** "Cash", or "Cash + Card" when it came in more than one way. */
  paidMethod: string | null;
  // Resolved bank details to print in the "How to pay" block (unpaid only).
  payTo: Required<BillPayTo>;
  // Per-field visibility toggles.
  show: BillShow;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Normalises whatever is stored in the billItems JSON column into clean line
// items: a label, a whole quantity of at least 1, a unit price, and the line
// total. Old items without a quantity read as one of `amount`.
export function normaliseItems(
  raw: BillTicket["billItems"],
): Required<BillLineItem>[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (i): i is BillLineItem =>
        !!i && typeof i.label === "string" && i.label.trim().length > 0,
    )
    .map((i) => {
      const qty = Math.max(1, Math.round(Number(i.qty) || 1));
      const amount = Number.isFinite(Number(i.amount)) ? Number(i.amount) : 0;
      const unitPrice =
        i.unitPrice !== undefined && Number.isFinite(Number(i.unitPrice))
          ? Number(i.unitPrice)
          : round2(amount / qty);
      return { label: i.label.trim(), qty, unitPrice, amount: round2(amount) };
    });
}

// Per-bill overrides win, then the shop's default account from Settings, then
// the build-time env values. A generated bill stores its own `billPayTo`, so
// changing banks never rewrites an invoice that has already been issued; the
// fallback chain only matters for bills that predate the bill builder.
function resolvePayTo(
  override: BillPayTo | null,
  shopDefault?: BillPayTo,
): Required<BillPayTo> {
  const o = override ?? {};
  const d = shopDefault ?? {};
  return {
    bankName: o.bankName?.trim() || d.bankName?.trim() || BANK_DETAILS.bankName,
    branch: o.branch?.trim() || d.branch?.trim() || BANK_DETAILS.branch,
    accountName:
      o.accountName?.trim() || d.accountName?.trim() || BANK_DETAILS.accountName,
    accountNumber:
      o.accountNumber?.trim() ||
      d.accountNumber?.trim() ||
      BANK_DETAILS.accountNumber,
  };
}

// Every payment on the repair, oldest first: the ones recorded on the bill
// page, verified online transfers, and (for repairs from before the bill page
// could record payments) the single hand-entered "Customer paid".
function paymentRows(ticket: BillTicket): BillPaymentRow[] {
  const rows: BillPaymentRow[] = ticket.billPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    at: new Date(p.at),
    by: p.by ?? null,
    online: false,
  }));
  if (
    rows.length === 0 &&
    ticket.paidAmount !== null &&
    Number(ticket.paidAmount) > 0
  ) {
    rows.push({
      id: "legacy",
      amount: Number(ticket.paidAmount),
      method: ticket.paidMethod ?? "Cash",
      at: ticket.paidAt ?? ticket.completedAt ?? ticket.createdAt,
      by: null,
      online: false,
    });
  }
  ticket.onlinePayments.forEach((p, i) =>
    rows.push({
      id: `online-${i}`,
      amount: Number(p.amount),
      method: "Bank transfer",
      at: p.createdAt,
      by: null,
      online: true,
    }),
  );
  return rows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// Single source of truth for bill math: the admin page, the customer's link
// and the printed PDF must always show identical figures.
export function computeBill(
  ticket: BillTicket,
  /** The shop's current default account, from Settings > Bank accounts. */
  shopPayTo?: BillPayTo,
): BillTotals {
  const deviceName =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") || "Device";
  const owner = ticket.customer?.name ?? ticket.customerName ?? "Customer";
  // Invoice date = when the bill was generated (frozen at generation time),
  // falling back to completion/creation for bills made before this existed.
  const billDate =
    ticket.billGeneratedAt ?? ticket.completedAt ?? ticket.createdAt;
  const warrantyEnd = warrantyEndDate(billDate, ticket.warrantyPeriod);
  const payTo = resolvePayTo(ticket.billPayTo, shopPayTo);
  const show = resolveBillShow(ticket.billShow);

  const payments = paymentRows(ticket);
  const paidTotal = round2(payments.reduce((sum, p) => sum + p.amount, 0));

  const items = normaliseItems(ticket.billItems);
  const isItemized = items.length > 0;

  let subtotal: number;
  let discountAmount = 0;
  let discountLabel = "";

  if (isItemized) {
    // Itemised bill (admin-built): the admin's line items + discount define
    // the total; the loyalty discountPercent is intentionally ignored here.
    subtotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
    const fixed = ticket.billDiscountAmount ? Number(ticket.billDiscountAmount) : 0;
    const pct = ticket.billDiscountPercent ? Number(ticket.billDiscountPercent) : 0;
    if (fixed > 0) {
      discountAmount = Math.min(round2(fixed), subtotal);
      discountLabel = "Discount";
    } else if (pct > 0) {
      discountAmount = round2(subtotal * (pct / 100));
      discountLabel = `Discount (${pct}%)`;
    }
  } else {
    // No bill made yet: the confirmed price, else the quote.
    const finalCost = ticket.finalCost ? Number(ticket.finalCost) : null;
    const pct = ticket.discountPercent ? Number(ticket.discountPercent) : 0;
    subtotal =
      finalCost ?? (ticket.estimatedCost ? Number(ticket.estimatedCost) : 0);
    if (pct > 0 && finalCost !== null) {
      discountAmount = round2(finalCost * (pct / 100));
      discountLabel = `Loyalty discount (${pct}%)`;
    }
    // An old repair marked paid by hand with no price on file: the amount
    // paid is the bill.
    if (subtotal === 0 && paidTotal > 0) subtotal = paidTotal;
  }

  const total = round2(Math.max(0, subtotal - discountAmount));
  const balance = round2(Math.max(0, total - paidTotal));
  const isSettled = paidTotal > 0 && balance === 0;
  const state: BillState = isSettled
    ? "paid"
    : paidTotal > 0
      ? "partial"
      : isItemized
        ? "issued"
        : "draft";

  const last = payments[payments.length - 1];
  const methods = [...new Set(payments.map((p) => p.method))];

  return {
    deviceName,
    owner,
    technician: ticket.technician,
    billDate,
    warrantyEnd,
    isItemized,
    items,
    subtotal,
    discountLabel,
    discountAmount,
    total,
    payments,
    paidTotal,
    balance,
    state,
    isSettled,
    paidDate: isSettled ? (last?.at ?? null) : null,
    paidMethod: methods.length > 0 ? methods.join(" + ") : null,
    payTo,
    show,
  };
}

/** The customer's bill link: no sign-in, keyed on the unguessable token. */
export function invoicePath(trackToken: string): string {
  return `/invoice/${encodeURIComponent(trackToken)}`;
}
