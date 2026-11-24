"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Loader2, X } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { NextStepButton } from "@/components/admin/next-step-button";
import { setTicketsArchived } from "@/lib/actions/tickets";
import { cn } from "@/lib/utils";

/** One repair, already shaped for display by the page. */
export type RepairRowData = {
  id: string;
  number: string;
  device: string;
  problem: string;
  customer: string;
  phone: string | null;
  status: TicketStatus;
  stepLabel: string;
  stepClass: string;
  /** "107 days" or "12 Aug 2026". */
  when: string;
  late: boolean;
  money: string;
  moneyClass?: string;
  estimatedCost: number | null;
  archived: boolean;
};

export type SortKey = "date" | "customer" | "step" | "money";

// The repairs list, like an online shop's orders page: one row per repair
// with its step, how long it has waited, the money and the next button.
// Tick rows to archive (hide) or bring back several at once.
export function RepairsTable({
  rows,
  sort,
  dir,
  sortHref,
  whenLabel,
  showNext,
}: {
  rows: RepairRowData[];
  sort: SortKey;
  dir: "asc" | "desc";
  /** Link for a heading: same filters, that sort (flips direction if already on it). */
  sortHref: Record<SortKey, string>;
  whenLabel: string;
  /** Next-step buttons, only on lists of open repairs. */
  showNext: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const pickedRows = rows.filter((r) => picked.has(r.id));
  const restoring = pickedRows.length > 0 && pickedRows.every((r) => r.archived);

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const archive = (archived: boolean) =>
    start(async () => {
      const ids = pickedRows.map((r) => r.id);
      const res = await setTicketsArchived({ ticketIds: ids, archived });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPicked(new Set());
      toast.success(
        archived
          ? `${res.count} repair${res.count === 1 ? "" : "s"} archived. Find them under Archived.`
          : `${res.count} repair${res.count === 1 ? "" : "s"} back in the list.`,
        {
          action: {
            label: "Undo",
            onClick: async () => {
              await setTicketsArchived({ ticketIds: ids, archived: !archived });
              router.refresh();
            },
          },
        },
      );
      router.refresh();
    });

  const Heading = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("py-3 pr-3 text-left font-bold", className)} aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link
        href={sortHref[k]}
        scroll={false}
        className={cn(
          "inline-flex min-h-8 items-center gap-1 rounded-md hover:text-foreground",
          sort === k && "text-foreground",
        )}
      >
        {children}
        {sort === k ? (dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />) : null}
      </Link>
    </th>
  );

  return (
    <div className="relative">
      {/* Bar for ticked rows */}
      {pickedRows.length > 0 ? (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-ink p-2 pl-4 text-ink-foreground shadow-lg">
          <span className="text-sm font-bold">{pickedRows.length} picked</span>
          <Button
            size="sm"
            className="bg-ink-foreground text-ink hover:bg-ink-foreground/90"
            onClick={() => archive(!restoring)}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : restoring ? <ArchiveRestore /> : <Archive />}
            {restoring ? "Bring back" : "Archive"}
          </Button>
          <button
            type="button"
            onClick={() => setPicked(new Set())}
            className="ml-auto inline-flex size-9 items-center justify-center rounded-xl hover:bg-ink-foreground/15"
            aria-label="Clear ticks"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {/* Laptop: table */}
      <div className="hidden overflow-hidden rounded-[1.5rem] bg-card md:block">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-[17%]" />
            <col className="w-[10.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[8rem]" />
            {showNext ? <col className="w-[9.5rem]" /> : null}
          </colgroup>
          <thead className="bg-secondary/50 text-xs tracking-[0.06em] text-muted-foreground uppercase">
            <tr>
              <th className="py-3 pl-4 text-left">
                <input
                  type="checkbox"
                  aria-label="Tick all"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="size-4 accent-primary"
                />
              </th>
              <th className="py-3 pr-3 text-left font-bold">Repair</th>
              <Heading k="customer">Customer</Heading>
              <Heading k="step">Step</Heading>
              <Heading k="date">{whenLabel}</Heading>
              <Heading k="money">Money</Heading>
              {showNext ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a,button,input,[role=dialog]")) return;
                  router.push(`/admin/tickets/${r.id}`);
                }}
                className={cn(
                  "cursor-pointer border-t border-border align-middle transition-colors hover:bg-accent/60",
                  picked.has(r.id) && "bg-primary/5",
                )}
              >
                <td className="py-3 pl-4">
                  <input
                    type="checkbox"
                    aria-label={`Tick ${r.device} ${r.number}`}
                    checked={picked.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="size-4 accent-primary"
                  />
                </td>
                <td className="py-3 pr-3">
                  <Link href={`/admin/tickets/${r.id}`} className="block font-extrabold leading-snug hover:underline">
                    {r.device}
                  </Link>
                  <span className="line-clamp-2 text-foreground/80">{r.problem}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {r.number}
                    {r.archived ? " · Archived" : ""}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <span className="block truncate font-bold">{r.customer}</span>
                  {r.phone ? <span className="block truncate text-xs text-muted-foreground">{r.phone}</span> : null}
                </td>
                <td className="py-3 pr-3">
                  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", r.stepClass)}>
                    {r.stepLabel}
                  </span>
                </td>
                <td className={cn("py-3 pr-3 whitespace-nowrap tabular-nums", r.late ? "font-bold text-destructive" : "text-muted-foreground")}>
                  {r.when}
                </td>
                <td className={cn("py-3 pr-3 font-bold whitespace-nowrap tabular-nums", r.moneyClass)}>{r.money}</td>
                {showNext ? (
                  <td className="py-2 pr-4">
                    <NextStepButton
                      ticketId={r.id}
                      status={r.status}
                      deviceName={r.device}
                      estimatedCost={r.estimatedCost}
                      tone={r.status === "IN_PROGRESS" ? "primary" : r.status === "COMPLETED" || r.status === "READY_FOR_PICKUP" ? "ink" : "secondary"}
                      className="h-10 w-full px-3 text-[13px]"
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: one row per repair */}
      <ul className="overflow-hidden rounded-[1.5rem] bg-card md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 border-t border-border p-3 first:border-t-0">
            <input
              type="checkbox"
              aria-label={`Tick ${r.device} ${r.number}`}
              checked={picked.has(r.id)}
              onChange={() => toggle(r.id)}
              className="size-5 shrink-0 accent-primary"
            />
            <Link href={`/admin/tickets/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold leading-snug">{r.device}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {r.problem} · {r.customer}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", r.stepClass)}>
                  {r.stepLabel}
                </span>
                <span className={cn("text-xs tabular-nums", r.late ? "font-bold text-destructive" : "text-muted-foreground")}>
                  {r.when}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
