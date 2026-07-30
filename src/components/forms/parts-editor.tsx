"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartEntry } from "@/lib/parts";
import { cn, formatLKR } from "@/lib/utils";

type Row = { key: string; part: string; supplier: string; cost: string };

let seq = 0;
const newRow = (part = "", supplier = "", cost = ""): Row => ({
  key: `p${seq++}`,
  part,
  supplier,
  cost,
});

// Repeatable "part + its supplier + what it cost us" rows. Each part carries
// its own supplier and cost because a repair needing two or three parts often
// sources them from different shops at different prices. Submitted as JSON in
// a hidden field (`name`), so the server action reads one value instead of
// parallel arrays. The running total is what drives the ticket's parts cost.
export function PartsEditor({
  name = "partsJson",
  initial,
  label = "Parts used",
  hint = "One row per part — its supplier and what the shop paid for it. Costs are internal and never printed on the customer's bill.",
  addLabel = "Add part",
  partPlaceholder = "e.g. Display",
  onTotalChange,
}: {
  name?: string;
  initial: PartEntry[];
  label?: string;
  hint?: string;
  addLabel?: string;
  partPlaceholder?: string;
  /** Reports the running parts total so the form can show it elsewhere. */
  onTotalChange?: (total: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length > 0
      ? initial.map((p) =>
          newRow(p.part, p.supplier ?? "", p.cost !== undefined ? String(p.cost) : ""),
        )
      : [newRow()],
  );

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (key: string) =>
    // Never leave the editor with no row at all — clear the last one instead.
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [newRow()]));

  const filled = useMemo(
    () =>
      rows
        .map((r) => ({
          part: r.part.trim(),
          supplier: r.supplier.trim(),
          cost: r.cost.trim() === "" ? undefined : Number(r.cost),
        }))
        .filter(
          (r) =>
            r.part.length > 0 &&
            (r.cost === undefined || Number.isFinite(r.cost)),
        ),
    [rows],
  );

  const total = filled.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  useEffect(() => {
    onTotalChange?.(total);
  }, [total, onTotalChange]);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(filled)} />
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" /> {label}
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={cn(
              "animate-fade-up grid gap-2 sm:grid-cols-[1.2fr_1.2fr_7rem_auto]",
              // Only rows added after the first render should slide in.
              i === 0 && "animate-none",
            )}
          >
            <Input
              aria-label={`Part ${i + 1}`}
              value={row.part}
              onChange={(e) => setRow(row.key, { part: e.target.value })}
              placeholder={partPlaceholder}
            />
            <Input
              aria-label={`Supplier for part ${i + 1}`}
              value={row.supplier}
              onChange={(e) => setRow(row.key, { supplier: e.target.value })}
              placeholder="e.g. Trans Asia Cellular"
            />
            <Input
              aria-label={`Cost of part ${i + 1} in LKR`}
              value={row.cost}
              onChange={(e) => setRow(row.key, { cost: e.target.value })}
              type="number"
              min="0"
              step="0.01"
              placeholder="Cost"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(row.key)}
              aria-label={`Remove part ${i + 1}`}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <p className="text-right text-xs text-muted-foreground">
        Parts total{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {formatLKR(total)}
        </span>
      </p>
    </div>
  );
}
