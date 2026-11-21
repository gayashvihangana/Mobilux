"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import type { RepairIssueStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillDocument, type BillShopInfo } from "@/components/bill-document";
import {
  computeBill,
  DEFAULT_BILL_SHOW,
  invoiceNumber,
  normaliseItems,
  PAYMENT_METHODS,
  type BillShow,
  type BillTicket,
} from "@/lib/bill";
import { BANK_DETAILS } from "@/lib/config";
import { whatsappHref } from "@/lib/phone";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import {
  generateBill,
  recordBillPayment,
  removeBillPayment,
} from "@/lib/actions/tickets";

// The bill page, as in docs/design-samples/bill.html (sections 1 and 2):
// items like a shopping cart on the left, the totals on the right, a status
// track at the top and one main button for whatever comes next. Payments can
// come in parts, so the bill always shows what is still owed.

type Row = { id: string; label: string; qty: string; price: string };
type PayTo = {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
};

const ISSUE_STATUS_LABEL: Record<RepairIssueStatus, string> = {
  PENDING: "Waiting for the customer's decision",
  ACCEPTED: "Free fix accepted",
  DECLINED: "Declined, refund agreed",
};

const QUICK_ITEMS = [
  "Labour",
  "Screen",
  "Battery",
  "Charging port",
  "Back cover",
  "Glass protector",
  "Diagnosis",
];

// Warranty choices. "No warranty" saves nothing, so no warranty prints.
// Anything else (say "1 year") goes in Other; the end date is worked out from
// any "N days / weeks / months / years".
const WARRANTY_OPTIONS = [
  "7 days",
  "14 days",
  "30 days",
  "2 months",
  "3 months",
  "6 months",
];

// What prints on the bill: each can be switched off in More options.
const PRINT_TOGGLES: { key: keyof BillShow; label: string }[] = [
  { key: "device", label: "Device name" },
  { key: "status", label: "Repair step" },
  { key: "issue", label: "Reported problem" },
  { key: "solution", label: "Work done" },
  { key: "technician", label: "Technician" },
  { key: "warranty", label: "Warranty" },
  { key: "repairIssue", label: "Issue during the repair" },
  { key: "notes", label: "Bill notes" },
  { key: "payment", label: "How to pay (while unpaid)" },
  { key: "track", label: "QR code" },
];

let rowSeq = 0;
const newRow = (label = "", price = "", qty = "1"): Row => ({
  id: `r${rowSeq++}`,
  label,
  qty,
  price,
});

const round2 = (n: number) => Math.round(n * 100) / 100;

// Format an instant as an Asia/Colombo `datetime-local` value, so the picker
// opens on the bill's own time zone rather than the viewer's.
function toColomboLocalInput(date: Date | null): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date ?? new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// A bill with no saved items starts from the repair: the price as labour,
// plus one line per part the shop used (price to fill in).
function seedRows(bill: BillTicket): Row[] {
  const saved = normaliseItems(bill.billItems);
  if (saved.length > 0) {
    return saved.map((i) => newRow(i.label, String(i.unitPrice), String(i.qty)));
  }
  const rows: Row[] = [];
  const parts = (bill.partsUsed ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) rows.push(newRow(part, ""));
  rows.unshift(
    newRow(
      parts.length > 0 ? "Labour" : bill.solution?.trim() || bill.issueTitle || "Repair",
      bill.finalCost ?? bill.estimatedCost ?? "",
    ),
  );
  return rows;
}

type FormValues = {
  rows: Row[];
  discountMode: "none" | "percent" | "amount";
  discountValue: string;
  technician: string;
  issueTitle: string;
  solution: string;
  warrantyPeriod: string;
  warrantyParts: string;
  issueWarranty: string;
  show: BillShow;
  payTo: PayTo;
  customDate: boolean;
  billDateValue: string;
};

function initialValues(
  bill: BillTicket,
  defaultShow: BillShow | undefined,
  fallbackPayTo: PayTo,
  warrantyDays: number | undefined,
): FormValues {
  return {
    rows: seedRows(bill),
    discountMode: bill.billDiscountAmount
      ? "amount"
      : bill.billDiscountPercent
        ? "percent"
        : "none",
    discountValue: bill.billDiscountAmount ?? bill.billDiscountPercent ?? "",
    technician: bill.technician ?? "",
    issueTitle: bill.issueTitle ?? "",
    solution: bill.solution ?? "",
    warrantyPeriod:
      bill.warrantyPeriod ??
      (bill.billItems === null && warrantyDays ? `${warrantyDays} days` : ""),
    warrantyParts: bill.warrantyParts ?? "",
    issueWarranty: bill.issueWarranty ?? "",
    show: bill.billShow ?? defaultShow ?? DEFAULT_BILL_SHOW,
    payTo: {
      bankName: bill.billPayTo?.bankName || fallbackPayTo.bankName,
      branch: bill.billPayTo?.branch || fallbackPayTo.branch,
      accountName: bill.billPayTo?.accountName || fallbackPayTo.accountName,
      accountNumber: bill.billPayTo?.accountNumber || fallbackPayTo.accountNumber,
    },
    customDate: false,
    billDateValue: toColomboLocalInput(bill.billGeneratedAt),
  };
}

/** Comparable snapshot of the form (row ids left out). */
function snapshot(v: FormValues) {
  return JSON.stringify({
    ...v,
    rows: v.rows
      .map((r) => ({ l: r.label.trim(), q: r.qty, p: r.price }))
      .filter((r) => r.l || r.p),
  });
}

export function BillBuilder({
  ticketId,
  bill,
  shop,
  trackQr,
  defaultPayTo,
  defaultShow,
  partsCost,
  invoiceUrl,
  customerPhone,
}: {
  ticketId: string;
  bill: BillTicket;
  /** Letterhead for the live preview; this component can't read the DB. */
  shop: BillShopInfo;
  trackQr?: string;
  defaultPayTo?: PayTo;
  /** The show/hide layout saved from the last bill the shop made. */
  defaultShow?: BillShow;
  partsCost: number;
  /** The customer's bill link (no sign-in). */
  invoiceUrl: string;
  customerPhone: string | null;
}) {
  const router = useRouter();
  const fallbackPayTo: PayTo = defaultPayTo ?? {
    bankName: BANK_DETAILS.bankName,
    branch: BANK_DETAILS.branch,
    accountName: BANK_DETAILS.accountName,
    accountNumber: BANK_DETAILS.accountNumber,
  };

  const [values, setValues] = useState<FormValues>(() =>
    initialValues(bill, defaultShow, fallbackPayTo, shop.warrantyDays),
  );
  const [baseline, setBaseline] = useState(() => snapshot(values));
  const [saving, startSaving] = useTransition();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [moreOpen, setMoreOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const setRow = (id: string, patch: Partial<Row>) =>
    setValues((v) => ({
      ...v,
      rows: v.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  const removeRow = (id: string) =>
    setValues((v) => ({ ...v, rows: v.rows.filter((r) => r.id !== id) }));
  const addRow = (label = "") =>
    setValues((v) => ({ ...v, rows: [...v.rows, newRow(label)] }));

  // ── Unsaved draft, kept across reloads until the bill is saved ──
  const draftKey = `mbx-draft:bill-${ticketId}`;
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<FormValues>;
      if (!Array.isArray(d.rows)) return;
      setValues((v) => ({
        ...v,
        ...d,
        rows: d.rows!.map((r) =>
          newRow(String(r.label ?? ""), String(r.price ?? ""), String(r.qty ?? "1")),
        ),
      }));
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  const current = snapshot(values);
  const dirty = current !== baseline;
  useEffect(() => {
    try {
      if (dirty) localStorage.setItem(draftKey, JSON.stringify(values));
      else localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  }, [dirty, values, draftKey]);

  // ── Live totals ─────────────────────────────────────────────
  const items = useMemo(
    () =>
      values.rows
        .map((r) => {
          const qty = Math.max(1, Math.round(Number(r.qty) || 1));
          const unitPrice = Math.max(0, Number(r.price) || 0);
          return {
            label: r.label.trim(),
            qty,
            unitPrice,
            amount: round2(qty * unitPrice),
          };
        })
        .filter((i) => i.label.length > 0),
    [values.rows],
  );

  const previewTicket: BillTicket = {
    ...bill,
    issueTitle: values.issueTitle.trim() || bill.issueTitle,
    solution: values.solution.trim() || null,
    technician: values.technician.trim() || null,
    billItems: items.length > 0 ? items : null,
    billDiscountPercent:
      values.discountMode === "percent" && values.discountValue
        ? values.discountValue
        : null,
    billDiscountAmount:
      values.discountMode === "amount" && values.discountValue
        ? values.discountValue
        : null,
    billPayTo: values.payTo,
    billGeneratedAt:
      values.customDate && values.billDateValue
        ? new Date(values.billDateValue)
        : (bill.billGeneratedAt ?? new Date()),
    warrantyPeriod: values.warrantyPeriod.trim() || null,
    warrantyParts: values.warrantyParts.trim() || null,
    issueWarranty: values.issueWarranty.trim() || null,
    billShow: values.show,
  };
  const live = computeBill(previewTicket, defaultPayTo);
  // The saved bill: what the customer sees right now.
  const saved = computeBill(bill, defaultPayTo);
  const isDraft = !(bill.billItems && bill.billItems.length > 0);
  const number = invoiceNumber(bill.ticketNumber);

  // ── Saving ──────────────────────────────────────────────────
  function save() {
    if (items.length === 0) {
      toast.error("Add at least one item first.");
      return;
    }
    const fd = new FormData();
    fd.set("ticketId", ticketId);
    fd.set("itemsJson", JSON.stringify(items));
    fd.set("billShowJson", JSON.stringify(values.show));
    fd.set("technician", values.technician);
    fd.set("issueTitle", values.issueTitle);
    fd.set("solution", values.solution);
    fd.set("warrantyPeriod", values.warrantyPeriod);
    fd.set("warrantyParts", values.warrantyParts);
    fd.set("issueWarranty", values.issueWarranty);
    fd.set("discountMode", values.discountMode);
    fd.set("discountValue", values.discountMode === "none" ? "" : values.discountValue);
    fd.set("billDate", values.customDate ? values.billDateValue : "");
    fd.set("payBankName", values.payTo.bankName);
    fd.set("payBranch", values.payTo.branch);
    fd.set("payAccountName", values.payTo.accountName);
    fd.set("payAccountNumber", values.payTo.accountNumber);
    const savedSnapshot = current;
    startSaving(async () => {
      const res = await generateBill(null, fd);
      if (res?.success) {
        setBaseline(savedSnapshot);
        toast.success(isDraft ? "Bill saved. You can send it now." : "Bill updated.");
        router.refresh();
      } else {
        toast.error(res?.error ?? "Couldn't save the bill.");
      }
    });
  }

  function discard() {
    const fresh = initialValues(bill, defaultShow, fallbackPayTo, shop.warrantyDays);
    setValues(fresh);
    setBaseline(snapshot(fresh));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invoiceUrl);
      toast.success("Bill link copied.");
    } catch {
      toast.error("Couldn't copy. The link is " + invoiceUrl);
    }
  }

  const firstName = (bill.customer?.name ?? bill.customerName ?? "").trim().split(/\s+/)[0];
  const waMessage = `Hi${firstName ? ` ${firstName}` : ""}, here is your bill from ${shop.name} for your ${saved.deviceName}${
    saved.balance > 0 ? `. Amount due: ${formatLKR(saved.balance)}` : ""
  }. ${invoiceUrl}`;
  const waHref = customerPhone ? whatsappHref(customerPhone, waMessage) : null;

  // The one main action: save while there are changes, then take payment,
  // then hand over the receipt.
  const main: { label: string; onClick?: () => void; href?: string } =
    dirty || isDraft
      ? { label: isDraft ? "Save bill" : "Save changes", onClick: save }
      : saved.balance > 0
        ? { label: "Record payment", onClick: () => setPayOpen(true) }
        : { label: "Download receipt", href: `/bill/${ticketId}?print=1` };

  const mainButton = (className?: string) =>
    main.href ? (
      <Button asChild size="lg" className={className}>
        <a href={main.href} target="_blank" rel="noreferrer">
          <Download /> {main.label}
        </a>
      </Button>
    ) : (
      <Button
        size="lg"
        className={className}
        onClick={main.onClick}
        disabled={saving || (main.onClick === save && items.length === 0)}
      >
        {saving ? <Loader2 className="animate-spin" /> : null}
        {main.label}
      </Button>
    );

  const profit = live.total - partsCost;

  return (
    <div className="space-y-4 pb-28 lg:pb-0">
      {/* ── Header: number, status, actions ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-card p-5">
        <div className="min-w-0 space-y-2">
          <Link
            href={`/admin/tickets/${ticketId}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {bill.ticketNumber} · {saved.deviceName}
          </Link>
          <h1 className="font-display flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Bill {number} <StatePill state={isDraft && saved.paidTotal === 0 ? "draft" : saved.state} />
          </h1>
          <StatusTrack
            isDraft={isDraft}
            savedOn={bill.billGeneratedAt}
            state={saved.state}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDraft ? (
            <>
              <Button asChild variant="secondary">
                <a href={`/bill/${ticketId}?print=1`} target="_blank" rel="noreferrer">
                  <Download /> PDF
                </a>
              </Button>
              <Button variant="secondary" onClick={copyLink}>
                <Copy /> Copy link
              </Button>
              {waHref ? (
                <Button asChild variant="secondary">
                  <a href={waHref} target="_blank" rel="noreferrer">
                    Send on WhatsApp
                  </a>
                </Button>
              ) : null}
            </>
          ) : null}
          {mainButton("hidden lg:inline-flex")}
        </div>
      </div>

      {/* ── Phone: Edit / Preview tabs ─────────────────────── */}
      <div role="tablist" aria-label="Bill view" className="flex rounded-2xl bg-secondary p-1 lg:hidden">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "h-11 flex-1 rounded-xl text-sm font-bold capitalize",
              tab === t && "bg-card shadow-sm",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* ── Left: items, discount, payments, more ─────────── */}
        <div className={cn("min-w-0 space-y-4", tab === "preview" && "hidden lg:block")}>
          <section className="rounded-[24px] bg-card p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold">Items</h2>
              <span className="text-sm text-muted-foreground">Qty × price</span>
            </div>
            <ul>
              {values.rows.map((row) => {
                const qty = Math.max(1, Math.round(Number(row.qty) || 1));
                const lineTotal = round2(qty * (Number(row.price) || 0));
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Input
                        aria-label="Item"
                        value={row.label}
                        onChange={(e) => setRow(row.id, { label: e.target.value })}
                        placeholder="e.g. Screen replacement"
                        className="font-semibold"
                      />
                      <RemoveRow label={row.label} onClick={() => removeRow(row.id)} className="sm:hidden" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-11 shrink-0 items-center rounded-xl bg-secondary">
                        <button
                          type="button"
                          aria-label="One less"
                          onClick={() => setRow(row.id, { qty: String(Math.max(1, qty - 1)) })}
                          className="flex size-11 items-center justify-center disabled:opacity-40"
                          disabled={qty <= 1}
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-6 text-center font-bold tabular-nums" aria-label="Quantity">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label="One more"
                          onClick={() => setRow(row.id, { qty: String(qty + 1) })}
                          className="flex size-11 items-center justify-center"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <Input
                        aria-label={`Price each for ${row.label.trim() || "item"}`}
                        value={row.price}
                        onChange={(e) => setRow(row.id, { price: e.target.value })}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        className="min-w-0 flex-1 [appearance:textfield] px-2.5 text-right font-bold tabular-nums sm:w-28 sm:flex-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="min-w-[5.5rem] shrink-0 text-right text-sm font-bold tabular-nums">
                        {formatLKR(lineTotal)}
                      </span>
                      <RemoveRow label={row.label} onClick={() => removeRow(row.id)} className="hidden sm:inline-flex" />
                    </div>
                  </li>
                );
              })}
            </ul>
            {values.rows.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No items yet. Add one below.</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_ITEMS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => addRow(label)}
                  className="inline-flex h-11 items-center gap-1 rounded-full bg-secondary px-4 text-sm font-bold hover:bg-accent"
                >
                  <Plus className="size-3.5" /> {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addRow()}
                className="inline-flex h-11 items-center gap-1 rounded-full bg-ink px-4 text-sm font-bold text-ink-foreground"
              >
                <Plus className="size-3.5" /> Other item
              </button>
            </div>
          </section>

          <section className="rounded-[24px] bg-card p-5">
            <h2 className="mb-3 text-lg font-extrabold">Discount</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-[1_1_16rem] gap-1 rounded-2xl bg-secondary p-1">
                {(
                  [
                    ["none", "None"],
                    ["percent", "Percent"],
                    ["amount", "LKR amount"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={values.discountMode === mode}
                    onClick={() => set("discountMode", mode)}
                    className={cn(
                      "h-10 flex-1 rounded-xl text-sm font-bold",
                      values.discountMode === mode && "bg-card shadow-sm",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {values.discountMode !== "none" ? (
                <Input
                  aria-label={values.discountMode === "percent" ? "Percent off" : "Amount off in LKR"}
                  value={values.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder={values.discountMode === "percent" ? "%" : "LKR"}
                  className="w-36 text-right font-bold"
                />
              ) : null}
            </div>
          </section>

          <PaymentsCard
            ticketId={ticketId}
            payments={saved.payments}
            canRecord={saved.balance > 0 || isDraft}
            onRecord={() => setPayOpen(true)}
          />

          {/* ── More options ─────────────────────────────────── */}
          <section className="rounded-[24px] bg-card p-5">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
              className="flex min-h-11 w-full items-center justify-between text-left"
            >
              <span className="text-lg font-extrabold">More options</span>
              <ChevronDown className={cn("size-5 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {!moreOpen ? (
              <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-muted-foreground">
                <span className="rounded-full bg-secondary px-3 py-1.5">
                  Warranty: {values.warrantyPeriod.trim() || "none"}
                </span>
                {values.technician.trim() ? (
                  <span className="rounded-full bg-secondary px-3 py-1.5">
                    Technician: {values.technician.trim()}
                  </span>
                ) : null}
                <span className="rounded-full bg-secondary px-3 py-1.5">
                  Pay to: {values.payTo.bankName} · {values.payTo.accountNumber}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1.5">What prints</span>
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Reported problem" id="b-issue">
                    <Textarea
                      id="b-issue"
                      rows={2}
                      value={values.issueTitle}
                      onChange={(e) => set("issueTitle", e.target.value)}
                      className="resize-none"
                    />
                  </Field>
                  <Field label="Work done" id="b-solution">
                    <Textarea
                      id="b-solution"
                      rows={2}
                      value={values.solution}
                      onChange={(e) => set("solution", e.target.value)}
                      placeholder="What was done to fix it"
                      className="resize-none"
                    />
                  </Field>
                  <Field label="Technician" id="b-tech">
                    <Input
                      id="b-tech"
                      value={values.technician}
                      onChange={(e) => set("technician", e.target.value)}
                      placeholder="Who did the repair"
                    />
                  </Field>
                </div>

                <WarrantyPicker
                  period={values.warrantyPeriod}
                  parts={values.warrantyParts}
                  onPeriod={(v) => set("warrantyPeriod", v)}
                  onParts={(v) => set("warrantyParts", v)}
                />

                {bill.issues.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Issue during the repair</Label>
                    <ul className="space-y-2">
                      {bill.issues.map((issue, i) => (
                        <li key={i} className="rounded-2xl bg-warning-soft px-4 py-3 text-sm">
                          <p className="font-bold">{ISSUE_STATUS_LABEL[issue.status]}</p>
                          <p className="mt-1 whitespace-pre-wrap">{issue.note}</p>
                          {issue.solution ? (
                            <p className="mt-1 text-muted-foreground">Free fix: {issue.solution}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <Input
                      aria-label="Warranty on the free fix"
                      value={values.issueWarranty}
                      onChange={(e) => set("issueWarranty", e.target.value)}
                      placeholder="Warranty on the free fix, e.g. 1 month on the back glass"
                    />
                    <p className="text-sm text-muted-foreground">
                      To change what happened, edit the issue on the repair page.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Pay to (printed while the bill is unpaid)</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["bankName", "Bank name"],
                        ["branch", "Branch"],
                        ["accountName", "Account name"],
                        ["accountNumber", "Account number"],
                      ] as const
                    ).map(([key, label]) => (
                      <Input
                        key={key}
                        aria-label={label}
                        placeholder={label}
                        value={values.payTo[key]}
                        onChange={(e) => set("payTo", { ...values.payTo, [key]: e.target.value })}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your accounts are set in Settings, under Bills and payments.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex min-h-11 items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Set the bill date myself</span>
                    <Switch
                      checked={values.customDate}
                      onCheckedChange={(on) => set("customDate", on)}
                    />
                  </label>
                  {values.customDate ? (
                    <Input
                      type="datetime-local"
                      aria-label="Bill date and time"
                      value={values.billDateValue}
                      onChange={(e) => set("billDateValue", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {bill.billGeneratedAt
                        ? `Dated ${formatDate(bill.billGeneratedAt)}, when it was first saved.`
                        : "Dated today when you save it."}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>What prints on the bill</Label>
                  <div className="grid sm:grid-cols-2 sm:gap-x-6">
                    {PRINT_TOGGLES.map((t) => (
                      <label key={t.key} className="flex min-h-11 items-center justify-between gap-3 border-b border-border text-sm">
                        <span>{t.label}</span>
                        <Switch
                          checked={values.show[t.key]}
                          onCheckedChange={(on) => set("show", { ...values.show, [t.key]: on })}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="pt-1 text-sm text-muted-foreground">
                    Bill notes are written on the repair page.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right: summary and preview ─────────────────────── */}
        <div className={cn("min-w-0 space-y-4 lg:sticky lg:top-6", tab === "edit" && "hidden lg:block")}>
          <section className="rounded-[24px] bg-card p-5">
            <h2 className="mb-3 text-lg font-extrabold">Summary</h2>
            <dl className="space-y-2.5">
              <SumRow
                label={`Subtotal · ${items.reduce((n, i) => n + i.qty, 0)} items`}
                value={formatLKR(live.subtotal)}
                muted
              />
              {live.discountAmount > 0 ? (
                <SumRow
                  label={live.discountLabel}
                  value={`− ${formatLKR(live.discountAmount)}`}
                  className="text-success"
                />
              ) : null}
              <div className="border-t border-border pt-2.5">
                <SumRow label="Total" value={formatLKR(live.total)} className="text-xl font-extrabold" />
              </div>
              {live.paidTotal > 0 ? (
                <SumRow label="Paid" value={`− ${formatLKR(live.paidTotal)}`} muted />
              ) : null}
              <div
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-lg font-extrabold",
                  live.balance > 0 ? "bg-warning-soft" : "bg-success/15 text-success",
                )}
              >
                <dt>{live.balance > 0 ? "Balance due" : "Paid in full"}</dt>
                <dd className="tabular-nums">{formatLKR(live.balance > 0 ? live.balance : live.total)}</dd>
              </div>
            </dl>
            {partsCost > 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Profit if paid in full:{" "}
                <b className={cn("text-foreground", profit < 0 && "text-destructive")}>
                  {formatLKR(profit)}
                </b>{" "}
                (parts and costs {formatLKR(partsCost)}). The customer never sees this.
              </p>
            ) : null}
            {dirty && !isDraft ? (
              <p className="mt-3 text-sm font-semibold text-warning">
                You have changes the customer can&apos;t see until you save.
              </p>
            ) : null}
          </section>

          <section aria-label="Bill preview" className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-bold text-muted-foreground">What the customer sees</p>
              {!isDraft ? (
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-bold text-primary"
                >
                  Open their link ↗
                </a>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-2xl">
              <BillDocument
                ticket={previewTicket}
                shop={shop}
                shopPayTo={defaultPayTo}
                trackQr={trackQr}
              />
            </div>
          </section>
        </div>
      </div>

      {/* ── Unsaved bar (laptop) ─────────────────────────────── */}
      {dirty && !isDraft ? (
        <div className="fixed inset-x-0 bottom-6 z-30 hidden justify-center px-4 lg:flex lg:pl-64">
          <div className="flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-ink-foreground shadow-xl">
            <span className="text-sm font-semibold">Unsaved changes to the bill</span>
            <Button variant="ghost" className="text-ink-foreground hover:bg-white/10 hover:text-ink-foreground" onClick={discard}>
              Discard
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null} Save changes
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Phone bar: balance and the next action ──────────── */}
      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-border bg-card px-4 py-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted-foreground">
            {live.balance > 0 ? "Balance due" : "Paid in full"}
          </p>
          <p className="text-xl font-extrabold tabular-nums">
            {formatLKR(live.balance > 0 ? live.balance : live.total)}
          </p>
        </div>
        {dirty && !isDraft ? (
          <Button variant="secondary" size="lg" onClick={discard} aria-label="Discard changes">
            <X />
          </Button>
        ) : null}
        {mainButton()}
      </div>

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        ticketId={ticketId}
        balance={saved.balance > 0 ? saved.balance : live.total}
      />
    </div>
  );
}

function RemoveRow({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={`Remove ${label.trim() || "item"}`}
      className={cn("shrink-0 text-muted-foreground hover:text-destructive", className)}
    >
      <X />
    </Button>
  );
}

function WarrantyPicker({
  period,
  parts,
  onPeriod,
  onParts,
}: {
  period: string;
  parts: string;
  onPeriod: (value: string) => void;
  onParts: (value: string) => void;
}) {
  const trimmed = period.trim();
  const preset = WARRANTY_OPTIONS.find((o) => o.toLowerCase() === trimmed.toLowerCase());
  // Other stays open while its box is being typed in, even when empty.
  const [other, setOther] = useState(!!trimmed && !preset);
  // Follow outside changes (Discard, a restored draft) unless typing in Other.
  useEffect(() => {
    if (document.activeElement?.id === "b-warranty") return;
    if (preset) setOther(false);
    else if (trimmed) setOther(true);
  }, [trimmed, preset]);
  const selected = other ? "other" : trimmed ? preset : "none";
  const chip = (on: boolean) =>
    cn(
      "inline-flex h-11 items-center rounded-full px-4 text-sm font-bold transition-colors",
      on ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent",
    );

  return (
    <div className="space-y-2">
      <Label id="b-warranty-label">Warranty</Label>
      <div role="radiogroup" aria-labelledby="b-warranty-label" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={selected === "none"}
          className={chip(selected === "none")}
          onClick={() => {
            setOther(false);
            onPeriod("");
          }}
        >
          No warranty
        </button>
        {WARRANTY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected === option}
            className={chip(selected === option)}
            onClick={() => {
              setOther(false);
              onPeriod(option);
            }}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={selected === "other"}
          className={chip(selected === "other")}
          onClick={() => {
            setOther(true);
            if (preset) onPeriod("");
            requestAnimationFrame(() => document.getElementById("b-warranty")?.focus());
          }}
        >
          Other
        </button>
      </div>
      <div className={cn("grid gap-2", other && "sm:grid-cols-2")}>
        {other ? (
          <Input
            id="b-warranty"
            aria-label="Warranty period"
            value={period}
            onChange={(e) => onPeriod(e.target.value)}
            placeholder="e.g. 1 year or 45 days"
          />
        ) : null}
        {selected !== "none" ? (
          <Input
            aria-label="Warranty covers"
            value={parts}
            onChange={(e) => onParts(e.target.value)}
            placeholder="Covers (optional), e.g. screen"
          />
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SumRow({
  label,
  value,
  muted,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-3", className)}>
      <dt className={muted ? "text-muted-foreground" : undefined}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function StatePill({ state }: { state: "draft" | "issued" | "partial" | "paid" }) {
  const meta = {
    draft: { label: "Draft", cls: "bg-secondary text-muted-foreground" },
    issued: { label: "Unpaid", cls: "bg-primary/10 text-primary" },
    partial: { label: "Part paid", cls: "bg-warning-soft text-warning" },
    paid: { label: "Paid", cls: "bg-success/15 text-success" },
  }[state];
  return (
    <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold", meta.cls)}>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

// Draft → Saved → Part paid → Paid, with the current one in blue.
function StatusTrack({
  isDraft,
  savedOn,
  state,
}: {
  isDraft: boolean;
  savedOn: Date | null;
  state: "draft" | "issued" | "partial" | "paid";
}) {
  const reached = state === "paid" ? 4 : state === "partial" ? 3 : isDraft ? 1 : 2;
  const steps = [
    "Draft",
    savedOn && !isDraft ? `Saved ${formatDate(savedOn)}` : "Saved",
    "Part paid",
    "Paid",
  ];
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Bill progress">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < reached || (n === 4 && reached === 4);
        const now = n === reached && !done;
        return (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden="true" className="h-0.5 w-4 bg-border" /> : null}
            <span
              aria-current={now ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 text-sm font-bold",
                done ? "text-foreground" : now ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  done ? "bg-ink text-ink-foreground" : now ? "bg-primary text-primary-foreground" : "bg-secondary",
                )}
              >
                {done ? <Check className="size-3.5" /> : n}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PaymentsCard({
  ticketId,
  payments,
  canRecord,
  onRecord,
}: {
  ticketId: string;
  payments: ReturnType<typeof computeBill>["payments"];
  canRecord: boolean;
  onRecord: () => void;
}) {
  const router = useRouter();
  const [removing, startRemoving] = useTransition();

  function remove(paymentId: string, label: string) {
    if (!window.confirm(`Remove the ${label} payment? The bill will show it as owed again.`)) return;
    startRemoving(async () => {
      const res = await removeBillPayment({ ticketId, paymentId });
      if (res?.success) {
        toast.success("Payment removed.");
        router.refresh();
      } else toast.error(res?.error ?? "Couldn't remove it.");
    });
  }

  return (
    <section className="rounded-[24px] bg-card p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Payments</h2>
        {canRecord ? (
          <Button variant="secondary" onClick={onRecord}>
            <Plus /> Record payment
          </Button>
        ) : null}
      </div>
      {payments.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          Nothing paid yet. Record a deposit or the full amount when the customer pays.
        </p>
      ) : (
        <ul>
          {payments.map((p) => {
            const label = `${formatLKR(p.amount)} ${p.method.toLowerCase()}`;
            return (
              <li key={p.id} className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Check className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{p.online ? "Online · bank transfer" : p.method}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(p.at)}
                    {p.by ? ` · by ${p.by}` : ""}
                    {p.online ? " · verified under Payments" : ""}
                  </p>
                </div>
                <b className="tabular-nums">{formatLKR(p.amount)}</b>
                {p.online ? null : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove the ${label} payment`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={removing}
                    onClick={() => remove(p.id, label)}
                  >
                    <X />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  ticketId,
  balance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  balance: number;
}) {
  const router = useRouter();
  const [full, setFull] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Cash");
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (open) {
      setFull(true);
      setAmount(String(balance));
      setMethod("Cash");
    }
  }, [open, balance]);

  const value = full ? balance : Number(amount) || 0;
  const settles = value >= balance - 0.005;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!(value > 0)) {
      toast.error("Enter an amount above zero.");
      return;
    }
    startSaving(async () => {
      const res = await recordBillPayment({ ticketId, amount: value, method });
      if (res?.success) {
        toast.success(settles ? "Paid in full. The bill is now a receipt." : `${formatLKR(value)} recorded.`);
        onOpenChange(false);
        router.refresh();
      } else toast.error(res?.error ?? "Couldn't record the payment.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 max-w-full translate-y-0 rounded-b-none rounded-t-[28px] p-5 sm:top-[50%] sm:bottom-auto sm:max-w-md sm:translate-y-[-50%] sm:rounded-[28px]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-extrabold">Record payment</DialogTitle>
          <DialogDescription>Balance due: {formatLKR(balance)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Amount</Label>
            <div className="flex h-16 items-center gap-2 rounded-2xl bg-secondary px-4">
              <span className="font-bold text-muted-foreground">LKR</span>
              <input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={full ? String(balance) : amount}
                onChange={(e) => {
                  setFull(false);
                  setAmount(e.target.value);
                }}
                className="w-full bg-transparent text-3xl font-extrabold tabular-nums outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={full}
                onClick={() => setFull(true)}
                className={cn(
                  "h-11 rounded-full px-4 text-sm font-bold",
                  full ? "bg-ink text-ink-foreground" : "bg-secondary",
                )}
              >
                Full balance
              </button>
              <button
                type="button"
                aria-pressed={!full}
                onClick={() => {
                  setFull(false);
                  setAmount("");
                  document.getElementById("pay-amount")?.focus();
                }}
                className={cn(
                  "h-11 rounded-full px-4 text-sm font-bold",
                  !full ? "bg-ink text-ink-foreground" : "bg-secondary",
                )}
              >
                Other amount
              </button>
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">How they paid</legend>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "h-12 rounded-2xl text-sm font-bold",
                    method === m ? "bg-primary/10 text-primary ring-2 ring-primary" : "bg-secondary",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
          <Button
            type="submit"
            size="lg"
            disabled={saving || !(value > 0)}
            className={cn("h-14 w-full text-base", settles && "bg-success hover:bg-success/90")}
          >
            {saving ? <Loader2 className="animate-spin" /> : null}
            {settles ? "Save · bill becomes Paid" : `Save ${formatLKR(value)}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
