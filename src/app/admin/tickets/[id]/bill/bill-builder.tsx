"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BillDocument } from "@/components/bill-document";
import {
  DEFAULT_BILL_SHOW,
  type BillShow,
  type BillTicket,
} from "@/lib/bill";
import { BANK_DETAILS } from "@/lib/config";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import {
  generateBill,
  markBillPaid,
  markBillUnpaid,
  type TicketFormState,
} from "@/lib/actions/tickets";

type Row = { id: string; label: string; amount: string };
type PayTo = {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
};

const PRESETS = [
  "Parts",
  "Battery",
  "Screen / Display",
  "Service charge",
  "Labour",
  "Diagnostics",
  "Other",
];

const TOGGLES: { key: keyof BillShow; label: string }[] = [
  { key: "device", label: "Device" },
  { key: "status", label: "Status" },
  { key: "technician", label: "Technician" },
  { key: "issue", label: "Issue" },
  { key: "solution", label: "What we did" },
  { key: "warranty", label: "Warranty" },
  { key: "notes", label: "Notes" },
  { key: "payment", label: "How to pay" },
  { key: "track", label: "Track QR" },
];

let rowSeq = 0;
const newRow = (label = "", amount = ""): Row => ({
  id: `r${rowSeq++}`,
  label,
  amount,
});

// Format an instant as an Asia/Colombo `datetime-local` value
// ("YYYY-MM-DDTHH:MM"), so the date picker opens on the bill's own time zone
// rather than the viewer's. h23 avoids Intl's "24:00" midnight quirk.
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

function seedRows(bill: BillTicket): Row[] {
  if (bill.billItems && bill.billItems.length > 0) {
    return bill.billItems.map((i) => newRow(i.label, String(i.amount)));
  }
  const rows: Row[] = [
    newRow("Service charge", bill.finalCost ?? bill.estimatedCost ?? ""),
  ];
  if (bill.partsUsed) {
    for (const part of bill.partsUsed.split(",").map((p) => p.trim())) {
      if (part) rows.push(newRow(part, ""));
    }
  }
  return rows;
}

function useSuccessToast(state: TicketFormState, message: string) {
  const last = useRef<TicketFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) toast.success(message);
      else if (state?.error) toast.error(state.error);
    }
    last.current = state;
  }, [state, message]);
}

function FieldToggle({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        on
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground line-through",
      )}
    >
      {on ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
      {label}
    </button>
  );
}

export function BillBuilder({
  ticketId,
  bill,
  trackQr,
  defaultPayTo,
  isSettled,
  currentTotal,
  paidDate,
  paidMethod,
  hasOnlinePayment,
}: {
  ticketId: string;
  bill: BillTicket;
  trackQr?: string;
  defaultPayTo?: PayTo;
  isSettled: boolean;
  currentTotal: number;
  paidDate: string | null;
  paidMethod: string | null;
  hasOnlinePayment: boolean;
}) {
  const fallbackPayTo: PayTo = defaultPayTo ?? {
    bankName: BANK_DETAILS.bankName,
    branch: BANK_DETAILS.branch,
    accountName: BANK_DETAILS.accountName,
    accountNumber: BANK_DETAILS.accountNumber,
  };

  const [rows, setRows] = useState<Row[]>(() => seedRows(bill));
  const [technician, setTechnician] = useState(bill.technician ?? "");
  const [issueTitle, setIssueTitle] = useState(bill.issueTitle ?? "");
  const [solution, setSolution] = useState(bill.solution ?? "");
  const [warrantyPeriod, setWarrantyPeriod] = useState(
    bill.warrantyPeriod ?? "",
  );
  const [warrantyParts, setWarrantyParts] = useState(bill.warrantyParts ?? "");
  const [show, setShow] = useState<BillShow>(bill.billShow ?? DEFAULT_BILL_SHOW);
  const [discountMode, setDiscountMode] = useState<
    "none" | "percent" | "amount"
  >(
    bill.billDiscountAmount
      ? "amount"
      : bill.billDiscountPercent
        ? "percent"
        : "none",
  );
  const [discountValue, setDiscountValue] = useState(
    bill.billDiscountAmount ?? bill.billDiscountPercent ?? "",
  );
  const [payTo, setPayTo] = useState<PayTo>({
    bankName: bill.billPayTo?.bankName ?? fallbackPayTo.bankName,
    branch: bill.billPayTo?.branch ?? fallbackPayTo.branch,
    accountName: bill.billPayTo?.accountName ?? fallbackPayTo.accountName,
    accountNumber: bill.billPayTo?.accountNumber ?? fallbackPayTo.accountNumber,
  });

  const [state, formAction, pending] = useActionState(generateBill, null);
  useSuccessToast(state, "Bill generated. You can download it now.");

  // Once a bill exists, the Generate button locks to "Bill generated" until
  // the admin taps "Update bill" — then they can edit and re-generate, with a
  // choice to keep the original invoice date or re-issue with today's.
  const [editing, setEditing] = useState(false);
  const [reissue, setReissue] = useState(false);
  // Optional custom invoice date/time — back- or post-date the bill. When on,
  // it overrides the keep-original / re-issue choice entirely.
  const [customDate, setCustomDate] = useState(false);
  const [billDateValue, setBillDateValue] = useState(() =>
    toColomboLocalInput(bill.billGeneratedAt),
  );
  useEffect(() => {
    // Leave edit mode after a successful (re)generate.
    if (state?.success) {
      setEditing(false);
      setReissue(false);
    }
  }, [state]);

  // Draft persistence — keep an unsaved bill across reloads / errors, then
  // drop it once the bill is generated. Restore runs once on mount; the
  // first save (seeded values) is skipped so it never clobbers the draft.
  const draftKey = `mbx-draft:bill-builder-${ticketId}`;
  const restored = useRef(false);
  const firstSave = useRef(true);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (Array.isArray(d.rows))
        setRows(
          d.rows.map((r: { label?: unknown; amount?: unknown }) =>
            newRow(String(r.label ?? ""), String(r.amount ?? "")),
          ),
        );
      if (typeof d.technician === "string") setTechnician(d.technician);
      if (typeof d.issueTitle === "string") setIssueTitle(d.issueTitle);
      if (typeof d.solution === "string") setSolution(d.solution);
      if (typeof d.warrantyPeriod === "string")
        setWarrantyPeriod(d.warrantyPeriod);
      if (typeof d.warrantyParts === "string") setWarrantyParts(d.warrantyParts);
      if (d.show) setShow((s) => ({ ...s, ...d.show }));
      if (d.discountMode) setDiscountMode(d.discountMode);
      if (typeof d.discountValue === "string") setDiscountValue(d.discountValue);
      if (typeof d.customDate === "boolean") setCustomDate(d.customDate);
      if (typeof d.billDateValue === "string") setBillDateValue(d.billDateValue);
      if (d.payTo) setPayTo((p) => ({ ...p, ...d.payTo }));
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          rows: rows.map((r) => ({ label: r.label, amount: r.amount })),
          technician,
          issueTitle,
          solution,
          warrantyPeriod,
          warrantyParts,
          show,
          discountMode,
          discountValue,
          customDate,
          billDateValue,
          payTo,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    rows,
    technician,
    issueTitle,
    solution,
    warrantyPeriod,
    warrantyParts,
    show,
    discountMode,
    discountValue,
    customDate,
    billDateValue,
    payTo,
    draftKey,
  ]);

  useEffect(() => {
    if (state?.success) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
  }, [state, draftKey]);

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) =>
    setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = (label = "") => setRows((rs) => [...rs, newRow(label)]);
  const toggle = (key: keyof BillShow) =>
    setShow((s) => ({ ...s, [key]: !s[key] }));

  const cleanItems = useMemo(
    () =>
      rows
        .map((r) => ({ label: r.label.trim(), amount: Number(r.amount) || 0 }))
        .filter((r) => r.label.length > 0),
    [rows],
  );

  const subtotal = useMemo(
    () => cleanItems.reduce((s, i) => s + i.amount, 0),
    [cleanItems],
  );
  const discountNum = Number(discountValue) || 0;
  const discountAmount =
    discountMode === "amount"
      ? Math.min(discountNum, subtotal)
      : discountMode === "percent"
        ? Math.round(subtotal * (discountNum / 100) * 100) / 100
        : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const previewTicket: BillTicket = {
    ...bill,
    issueTitle: issueTitle.trim() || bill.issueTitle,
    solution: solution.trim() || null,
    technician: technician.trim() || null,
    billItems: cleanItems.length > 0 ? cleanItems : null,
    billDiscountPercent:
      discountMode === "percent" && discountValue ? String(discountValue) : null,
    billDiscountAmount:
      discountMode === "amount" && discountValue ? String(discountValue) : null,
    billPayTo: payTo,
    // Preview the invoice date the save will use: a custom date if one is set,
    // else today when re-issuing, else the frozen original (fallbacks handle a
    // never-generated bill).
    billGeneratedAt:
      customDate && billDateValue
        ? new Date(billDateValue)
        : reissue
          ? new Date()
          : bill.billGeneratedAt,
    warrantyPeriod: warrantyPeriod.trim() || null,
    warrantyParts: warrantyParts.trim() || null,
    billShow: show,
  };

  const hasGenerated = !!(bill.billItems && bill.billItems.length > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Builder ─────────────────────────────────────────── */}
      <div className="space-y-6">
        <form action={formAction}>
          <input type="hidden" name="ticketId" value={ticketId} />
          <input
            type="hidden"
            name="itemsJson"
            value={JSON.stringify(cleanItems)}
          />
          <input type="hidden" name="billShowJson" value={JSON.stringify(show)} />
          <input type="hidden" name="technician" value={technician} />
          <input type="hidden" name="issueTitle" value={issueTitle} />
          <input type="hidden" name="solution" value={solution} />
          <input type="hidden" name="warrantyPeriod" value={warrantyPeriod} />
          <input type="hidden" name="warrantyParts" value={warrantyParts} />
          <input type="hidden" name="discountMode" value={discountMode} />
          <input type="hidden" name="discountValue" value={discountValue} />
          <input type="hidden" name="reissue" value={reissue ? "true" : "false"} />
          <input
            type="hidden"
            name="billDate"
            value={customDate ? billDateValue : ""}
          />
          <input type="hidden" name="payBankName" value={payTo.bankName} />
          <input type="hidden" name="payBranch" value={payTo.branch} />
          <input type="hidden" name="payAccountName" value={payTo.accountName} />
          <input
            type="hidden"
            name="payAccountNumber"
            value={payTo.accountNumber}
          />

          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <Receipt className="size-5 text-primary" /> Bill details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Line items */}
              <div className="space-y-2">
                <Label>Line items</Label>
                <p className="text-xs text-muted-foreground">
                  Add a row per charge — parts, battery, service, etc. Remove any
                  you don&apos;t need. These are the prices the customer sees;
                  your internal part cost and private notes never appear on the
                  bill.
                </p>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <Input
                        aria-label="Item"
                        value={row.label}
                        onChange={(e) =>
                          setRow(row.id, { label: e.target.value })
                        }
                        placeholder="e.g. Screen replacement"
                        className="flex-1"
                      />
                      <Input
                        aria-label="Amount"
                        value={row.amount}
                        onChange={(e) =>
                          setRow(row.id, { amount: e.target.value })
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove item"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => addRow(p)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <Plus className="size-3" /> {p}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Discount */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discountMode">Discount</Label>
                  <Select
                    value={discountMode}
                    onValueChange={(v) =>
                      setDiscountMode(v as "none" | "percent" | "amount")
                    }
                  >
                    <SelectTrigger id="discountMode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No discount</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed amount (LKR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {discountMode !== "none" ? (
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      {discountMode === "percent"
                        ? "Percent off"
                        : "Amount off (LKR)"}
                    </Label>
                    <Input
                      id="discountValue"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                ) : null}
              </div>

              <Separator />

              {/* Repair details */}
              <div className="space-y-2">
                <Label htmlFor="issueTitle">Issue</Label>
                <Textarea
                  id="issueTitle"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  rows={2}
                  placeholder="The reported problem"
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution">What we did</Label>
                <Textarea
                  id="solution"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  rows={2}
                  placeholder="What was done to fix it"
                  className="resize-none"
                />
              </div>

              {/* Technician */}
              <div className="space-y-2">
                <Label htmlFor="technician">Technician</Label>
                <Input
                  id="technician"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  placeholder="Who did the repair"
                />
              </div>

              {/* Warranty */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="warrantyPeriod">Warranty period</Label>
                  <Input
                    id="warrantyPeriod"
                    value={warrantyPeriod}
                    onChange={(e) => setWarrantyPeriod(e.target.value)}
                    placeholder="e.g. 3 months"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warrantyParts">Warranty covers</Label>
                  <Input
                    id="warrantyParts"
                    value={warrantyParts}
                    onChange={(e) => setWarrantyParts(e.target.value)}
                    placeholder="e.g. Display, Battery"
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Shown on the bill only when the “Warranty” toggle below is on.
                </p>
              </div>

              <Separator />

              {/* Pay-to (bank details) */}
              <div className="space-y-2">
                <Label>Payment details (shown while unpaid)</Label>
                <p className="text-xs text-muted-foreground">
                  Where the customer pays. Prefilled from your shop defaults —
                  edit for this bill if needed, or set the shop default under
                  Admin → Settings.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    aria-label="Bank name"
                    value={payTo.bankName}
                    onChange={(e) =>
                      setPayTo((p) => ({ ...p, bankName: e.target.value }))
                    }
                    placeholder="Bank name"
                  />
                  <Input
                    aria-label="Branch"
                    value={payTo.branch}
                    onChange={(e) =>
                      setPayTo((p) => ({ ...p, branch: e.target.value }))
                    }
                    placeholder="Branch"
                  />
                  <Input
                    aria-label="Account name"
                    value={payTo.accountName}
                    onChange={(e) =>
                      setPayTo((p) => ({ ...p, accountName: e.target.value }))
                    }
                    placeholder="Account name"
                  />
                  <Input
                    aria-label="Account number"
                    value={payTo.accountNumber}
                    onChange={(e) =>
                      setPayTo((p) => ({ ...p, accountNumber: e.target.value }))
                    }
                    placeholder="Account number"
                  />
                </div>
              </div>

              <Separator />

              {/* Field visibility toggles */}
              <div className="space-y-2">
                <Label>Show on bill</Label>
                <p className="text-xs text-muted-foreground">
                  Tap to show or hide each field on the printed bill.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TOGGLES.map((t) => (
                    <FieldToggle
                      key={t.key}
                      on={show[t.key]}
                      label={t.label}
                      onClick={() => toggle(t.key)}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              {/* Live totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatLKR(subtotal)}</span>
                </div>
                {discountAmount > 0 ? (
                  <div className="flex justify-between text-primary">
                    <span>Discount</span>
                    <span>−{formatLKR(discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="font-display">{formatLKR(total)}</span>
                </div>
              </div>

              {/* Custom invoice date & time — back- or post-date the bill */}
              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={customDate}
                  onChange={(e) => setCustomDate(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span className="flex-1">
                  <span className="font-medium">
                    Set a custom bill date &amp; time
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Choose exactly what date and time the invoice shows —
                    handy for back-dating. Leave off to use{" "}
                    {hasGenerated && !reissue
                      ? "the current invoice date"
                      : "today’s date & time"}
                    .
                  </span>
                  {customDate ? (
                    <Input
                      type="datetime-local"
                      value={billDateValue}
                      onChange={(e) => setBillDateValue(e.target.value)}
                      className="mt-2"
                    />
                  ) : null}
                </span>
              </label>

              {/* Re-issue date choice — while editing a generated bill, unless
                  a custom date is already in charge of the invoice date. */}
              {hasGenerated && editing && !customDate ? (
                <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={reissue}
                    onChange={(e) => setReissue(e.target.checked)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="font-medium">
                      Re-issue with today&apos;s date
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Leave unchecked to keep the original invoice date. The paid
                      date is always separate.
                    </span>
                  </span>
                </label>
              ) : null}

              {hasGenerated && !editing ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled
                  >
                    <CheckCircle2 className="size-4" /> Bill generated
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="size-4" /> Update bill
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={pending || cleanItems.length === 0}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Receipt className="size-4" />
                  )}
                  {hasGenerated ? "Update & regenerate bill" : "Generate bill"}
                </Button>
              )}

              {hasGenerated || state?.success ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <a
                      href={`/bill/${ticketId}?print=1`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="size-4" /> Download bill
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/bill/${ticketId}`} target="_blank">
                      <Eye className="size-4" /> View bill
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </form>

        {/* Payment / receipt step */}
        <BillPaymentCard
          ticketId={ticketId}
          isSettled={isSettled}
          currentTotal={currentTotal}
          paidDate={paidDate}
          paidMethod={paidMethod}
          hasOnlinePayment={hasOnlinePayment}
        />
      </div>

      {/* ── Live preview ────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className="size-4" /> Live preview — updates as you type. Download
          uses the last generated version.
        </p>
        <div className="lg:sticky lg:top-6">
          <BillDocument ticket={previewTicket} trackQr={trackQr} />
        </div>
      </div>
    </div>
  );
}

function BillPaymentCard({
  ticketId,
  isSettled,
  currentTotal,
  paidDate,
  paidMethod,
  hasOnlinePayment,
}: {
  ticketId: string;
  isSettled: boolean;
  currentTotal: number;
  paidDate: string | null;
  paidMethod: string | null;
  hasOnlinePayment: boolean;
}) {
  const [method, setMethod] = useState("Cash");
  const [paidState, paidAction, paying] = useActionState(markBillPaid, null);
  const [unpaidState, unpaidAction, unpaying] = useActionState(
    markBillUnpaid,
    null,
  );
  useSuccessToast(paidState, "Marked as paid — the bill is now a receipt.");
  useSuccessToast(unpaidState, "Reverted to unpaid.");

  return (
    <Card className={isSettled ? "border-success/40 bg-success/5" : undefined}>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <BadgeCheck
            className={isSettled ? "size-5 text-success" : "size-5 text-primary"}
          />
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isSettled ? (
          <>
            <p className="text-sm">
              <span className="font-semibold text-success">Paid in full</span>
              {paidMethod ? ` · ${paidMethod}` : ""}
              {paidDate ? ` · ${formatDate(paidDate)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              The bill now shows a PAID seal and reads as a receipt. Grab the
              paid copy to send the customer.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`/bill/${ticketId}?print=1`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="size-4" /> Download receipt
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/bill/${ticketId}`} target="_blank">
                  <Eye className="size-4" /> View receipt
                </Link>
              </Button>
            </div>
            {hasOnlinePayment ? (
              <p className="text-xs text-muted-foreground">
                Settled by a verified online payment — manage it under Payments.
              </p>
            ) : (
              <form action={unpaidAction}>
                <input type="hidden" name="ticketId" value={ticketId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={unpaying}
                >
                  {unpaying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Undo2 className="size-4" />
                  )}
                  Mark as unpaid
                </Button>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Once the customer has paid, record it here to stamp the bill PAID.
            </p>
            <form action={paidAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="ticketId" value={ticketId} />
              <div className="space-y-1.5">
                <Label htmlFor="method" className="text-xs">
                  Method
                </Label>
                <Select name="method" value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={paying || !(currentTotal > 0)}>
                {paying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BadgeCheck className="size-4" />
                )}
                Mark as paid
              </Button>
            </form>
            {!(currentTotal > 0) ? (
              <p className="text-xs text-muted-foreground">
                Generate the bill first, then you can mark it paid.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
