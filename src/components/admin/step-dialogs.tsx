"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { stepContext, type StepContext } from "@/lib/actions/tickets";
import type { PartEntry } from "@/lib/parts";
import { cn, formatLKR } from "@/lib/utils";

// The windows behind the Diagnosed, Part arrived and Mark ready buttons.
// Each collects what that step needs (what was found, what the parts cost,
// the final price) and hands it to the button, which saves and moves on.

const round = (n: number) => Math.round(n);

/** Loads the repair's parts and prices when a window opens. */
function useStepContext(ticketId: string, open: boolean) {
  const [ctx, setCtx] = useState<StepContext | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setCtx(null);
    stepContext(ticketId).then((c) => live && setCtx(c));
    return () => {
      live = false;
    };
  }, [ticketId, open]);
  return ctx;
}

function Shell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  onSubmit,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onSubmit: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[92dvh] overflow-y-auto", wide && "sm:max-w-2xl")}>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter className="gap-2 sm:gap-2">{footer}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>;
}

function money(v: string) {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

const NUMBER =
  "[appearance:textfield] text-right tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

// ── Diagnosed ────────────────────────────────────────────────────────

export const DIAGNOSED_DEFAULT = "Checked the device and found the problem.";

export type DiagnosedResult = {
  comment: string;
  needsParts: boolean;
  /** Named parts (keeping any cost already saved for the same name), or undefined to leave them. */
  parts?: PartEntry[];
  price?: number;
};

export function DiagnosedDialog({
  open,
  onOpenChange,
  ticketId,
  deviceName,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  deviceName: string;
  pending: boolean;
  onSave: (result: DiagnosedResult) => void;
}) {
  const ctx = useStepContext(ticketId, open);
  const [comment, setComment] = useState(DIAGNOSED_DEFAULT);
  const [needsParts, setNeedsParts] = useState(false);
  const [names, setNames] = useState<string[]>([""]);
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!open) return;
    setComment(DIAGNOSED_DEFAULT);
    setNeedsParts(false);
    setNames([""]);
    setPrice("");
  }, [open]);
  useEffect(() => {
    if (!ctx) return;
    if (ctx.quoted != null) setPrice(String(round(ctx.quoted)));
    if (ctx.parts.length > 0) {
      setNeedsParts(true);
      setNames(ctx.parts.map((p) => p.part));
    }
  }, [ctx]);

  const priceValue = money(price);
  const priceBad = price.trim() !== "" && priceValue === null;

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={`Diagnosed: ${deviceName}`}
      description="What you found goes on the Diagnosing step of the timeline, which the customer sees."
      onSubmit={() => {
        if (priceBad) return;
        const named = needsParts ? names.map((n) => n.trim()).filter(Boolean) : [];
        onSave({
          comment,
          needsParts,
          parts:
            named.length > 0
              ? named.map(
                  (name) =>
                    ctx?.parts.find((p) => p.part.toLowerCase() === name.toLowerCase()) ?? { part: name },
                )
              : undefined,
          price: priceValue ?? undefined,
        });
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={pending || priceBad}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {needsParts ? "Diagnosed · wait for parts" : "Diagnosed · start repair"}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="dx-comment">
            What you found <Optional />
          </Label>
          {comment !== DIAGNOSED_DEFAULT ? (
            <button type="button" onClick={() => setComment(DIAGNOSED_DEFAULT)} className="text-xs font-bold text-primary hover:underline">
              Use the usual message
            </button>
          ) : null}
        </div>
        <Textarea
          id="dx-comment"
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          className="resize-none"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Parts</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [false, "No parts needed"],
              [true, "Needs parts"],
            ] as const
          ).map(([v, text]) => (
            <button
              key={text}
              type="button"
              aria-pressed={needsParts === v}
              onClick={() => setNeedsParts(v)}
              className={cn(
                "h-11 rounded-xl text-sm font-bold",
                needsParts === v ? "bg-primary/10 text-primary ring-2 ring-primary" : "bg-secondary",
              )}
            >
              {text}
            </button>
          ))}
        </div>
        {needsParts ? (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground">
              Name the parts if you know them <Optional />. You add what they cost when they arrive.
            </p>
            {names.map((n, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Part ${i + 1}`}
                  value={n}
                  onChange={(e) => setNames((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="e.g. Display"
                />
                {names.length > 1 ? (
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove part" onClick={() => setNames((l) => l.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                ) : null}
              </div>
            ))}
            <button type="button" onClick={() => setNames((l) => [...l, ""])} className="inline-flex min-h-9 items-center gap-1 text-sm font-bold text-primary">
              <Plus className="size-4" /> Another part
            </button>
          </div>
        ) : null}
      </fieldset>

      <div className="space-y-1.5 sm:max-w-xs">
        <Label htmlFor="dx-price">
          Price for the customer (LKR) <Optional />
        </Label>
        <Input
          id="dx-price"
          type="number"
          inputMode="numeric"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Or set it at Mark ready"
          aria-invalid={priceBad || undefined}
        />
      </div>
    </Shell>
  );
}

// ── Part arrived ─────────────────────────────────────────────────────

type PartRow = { part: string; cost: string; supplier: string };

export function PartArrivedDialog({
  open,
  onOpenChange,
  ticketId,
  deviceName,
  pending,
  defaultComment,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  deviceName: string;
  pending: boolean;
  defaultComment: string;
  onSave: (result: { comment: string; parts: PartEntry[] }) => void;
}) {
  const ctx = useStepContext(ticketId, open);
  const [rows, setRows] = useState<PartRow[]>([]);
  const [comment, setComment] = useState(defaultComment);

  useEffect(() => {
    if (open) setComment(defaultComment);
  }, [open, defaultComment]);
  useEffect(() => {
    if (!ctx) return;
    setRows(
      ctx.parts.length > 0
        ? ctx.parts.map((p) => ({ part: p.part, cost: p.cost != null ? String(p.cost) : "", supplier: p.supplier ?? "" }))
        : [{ part: "", cost: "", supplier: "" }],
    );
  }, [ctx]);

  const set = (i: number, patch: Partial<PartRow>) =>
    setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const bad = rows.some((r) => r.cost.trim() !== "" && money(r.cost) === null);
  const total = rows.reduce((s, r) => s + (money(r.cost) ?? 0), 0);

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={`Part arrived: ${deviceName}`}
      description="Add what each part cost you. It's saved with the repair's parts and never shown to the customer."
      wide
      onSubmit={() => {
        if (bad) return;
        onSave({
          comment,
          parts: rows
            .filter((r) => r.part.trim())
            .map((r) => ({
              part: r.part.trim(),
              ...(r.supplier.trim() ? { supplier: r.supplier.trim() } : {}),
              ...(money(r.cost) != null ? { cost: money(r.cost)! } : {}),
            })),
        });
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={pending || bad || !ctx}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Part arrived · start repair
          </Button>
        </>
      }
    >
      {!ctx ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the parts…
        </p>
      ) : (
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_8rem_1fr_2.5rem] gap-2 text-xs font-bold text-muted-foreground sm:grid">
            <span>Part</span>
            <span className="text-right">Cost (LKR)</span>
            <span>Supplier (optional)</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_2.5rem] gap-2 sm:grid-cols-[1fr_8rem_1fr_2.5rem]">
              <Input aria-label="Part" value={r.part} onChange={(e) => set(i, { part: e.target.value })} placeholder="e.g. Display" />
              <Input
                aria-label={`Cost of ${r.part || "part"}`}
                type="number"
                inputMode="numeric"
                min={0}
                value={r.cost}
                onChange={(e) => set(i, { cost: e.target.value })}
                placeholder="Cost"
                className={NUMBER}
                autoFocus={i === 0}
              />
              <Input
                aria-label="Supplier"
                value={r.supplier}
                onChange={(e) => set(i, { supplier: e.target.value })}
                placeholder="Supplier"
                className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove part"
                className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto"
                onClick={() => setRows((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : [{ part: "", cost: "", supplier: "" }]))}
              >
                <X />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setRows((l) => [...l, { part: "", cost: "", supplier: "" }])} className="inline-flex min-h-9 items-center gap-1 text-sm font-bold text-primary">
              <Plus className="size-4" /> Add a part
            </button>
            <span className="text-sm text-muted-foreground">
              Parts total <b className="text-foreground tabular-nums">{formatLKR(total)}</b>
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pa-comment">
          Comment <Optional />
        </Label>
        <Textarea id="pa-comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className="resize-none" />
      </div>
    </Shell>
  );
}

// ── Mark ready: price calculator ─────────────────────────────────────

type PriceRow = { part: string; cost: number; percent: string; price: string; touched: boolean };

export type ReadyResult = {
  comment: string;
  finalCost?: number;
  billItems: { label: string; qty: number; unitPrice: number }[];
};

export function MarkReadyDialog({
  open,
  onOpenChange,
  ticketId,
  deviceName,
  pending,
  defaultComment,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  deviceName: string;
  pending: boolean;
  defaultComment: string;
  onSave: (result: ReadyResult) => void;
}) {
  const ctx = useStepContext(ticketId, open);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [labour, setLabour] = useState("");
  const [comment, setComment] = useState(defaultComment);

  useEffect(() => {
    if (open) setComment(defaultComment);
  }, [open, defaultComment]);
  useEffect(() => {
    if (!ctx) return;
    const pct = ctx.markupPercent;
    const costed = ctx.parts.filter((p) => p.part);
    setRows(
      costed.map((p) => ({
        part: p.part,
        cost: p.cost ?? 0,
        percent: String(pct),
        price: String(round((p.cost ?? 0) * (1 + pct / 100))),
        touched: false,
      })),
    );
    // No parts: the work is the price, so start labour at the quote.
    setLabour(costed.length === 0 && ctx.quoted != null ? String(round(ctx.quoted)) : "");
  }, [ctx]);

  const setPercent = (i: number, percent: string) =>
    setRows((list) =>
      list.map((r, j) =>
        j === i
          ? { ...r, percent, price: String(round(r.cost * (1 + (Number(percent) || 0) / 100))), touched: false }
          : r,
      ),
    );
  const setAll = (percent: number) =>
    setRows((list) =>
      list.map((r) => ({ ...r, percent: String(percent), price: String(round(r.cost * (1 + percent / 100))), touched: false })),
    );

  const partsCost = rows.reduce((s, r) => s + r.cost, 0);
  const partsPrice = rows.reduce((s, r) => s + (money(r.price) ?? 0), 0);
  const labourValue = money(labour) ?? 0;
  const total = partsPrice + labourValue;
  const bad = rows.some((r) => money(r.price) === null) || (labour.trim() !== "" && money(labour) === null);

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={`Mark ready: ${deviceName}`}
      description="Work out the final price from your costs. It becomes the bill, and the customer's ready message says the amount to collect."
      wide
      onSubmit={() => {
        if (bad) return;
        const billItems = [
          ...rows.map((r) => ({ label: r.part, qty: 1, unitPrice: money(r.price) ?? 0 })),
          ...(labourValue > 0 ? [{ label: rows.length > 0 ? "Labour" : "Repair", qty: 1, unitPrice: labourValue }] : []),
        ];
        onSave({ comment, finalCost: total > 0 ? total : undefined, billItems: total > 0 ? billItems : [] });
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={pending || bad || !ctx}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {total > 0 ? `Mark ready · ${formatLKR(total)}` : "Mark ready"}
          </Button>
        </>
      }
    >
      {!ctx ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the costs…
        </p>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/60 p-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Quoted to customer</dt>
              <dd className="font-bold tabular-nums">{ctx.quoted != null ? formatLKR(ctx.quoted) : "No quote"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Your parts cost</dt>
              <dd className="font-bold tabular-nums">{formatLKR(partsCost)}</dd>
            </div>
          </dl>

          {rows.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Parts: cost + markup</p>
                <div className="flex gap-1.5">
                  {[30, 50, 100].map((p) => (
                    <button key={p} type="button" onClick={() => setAll(p)} className="h-8 rounded-full bg-secondary px-3 text-xs font-bold hover:bg-accent">
                      All +{p}%
                    </button>
                  ))}
                </div>
              </div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_5.5rem_7.5rem] items-center gap-2 rounded-xl border border-border p-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{r.part}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">Cost {formatLKR(r.cost)}</p>
                  </div>
                  <div className="relative">
                    <Input
                      aria-label={`Markup on ${r.part}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={r.percent}
                      onChange={(e) => setPercent(i, e.target.value)}
                      className={cn(NUMBER, "pr-7")}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                  <Input
                    aria-label={`Price of ${r.part}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={r.price}
                    onChange={(e) => setRows((l) => l.map((x, j) => (j === i ? { ...x, price: e.target.value, touched: true } : x)))}
                    className={cn(NUMBER, "font-bold")}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_7.5rem] items-center gap-2">
            <Label htmlFor="mr-labour">{rows.length > 0 ? "Labour" : "Repair price"}</Label>
            <Input
              id="mr-labour"
              type="number"
              inputMode="numeric"
              min={0}
              value={labour}
              onChange={(e) => setLabour(e.target.value)}
              placeholder="0"
              className={cn(NUMBER, "font-bold")}
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-ink-foreground">
            <span className="font-bold">Final price</span>
            <span className="font-display text-2xl font-extrabold tabular-nums">{formatLKR(total)}</span>
          </div>
          {total > 0 && partsCost > 0 ? (
            <p className="text-xs text-muted-foreground">
              Profit {formatLKR(total - partsCost)} · only you see this.
              {ctx.hasBill ? " This replaces the items on the saved bill." : ""}
            </p>
          ) : ctx.hasBill && total > 0 ? (
            <p className="text-xs text-muted-foreground">This replaces the items on the saved bill.</p>
          ) : null}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="mr-comment">
          Comment <Optional />
        </Label>
        <Textarea id="mr-comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className="resize-none" />
      </div>
    </Shell>
  );
}
