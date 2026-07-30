import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Plus, Receipt } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { LinkedTableRow } from "@/components/linked-table-row";
import { StatusBadge } from "@/components/status-badge";
import { DEVICE_TYPES, doneLabel, STATUS_META, STATUS_PIPELINE } from "@/lib/status";
import { issueChip } from "@/lib/repair-issue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate, formatLKR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Repairs",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid bills" },
  { value: "SUBMITTED", label: "Needs confirmation" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "RECEIVED", label: "Received" },
  { value: "DIAGNOSING", label: "Diagnosed" },
  { value: "AWAITING_PARTS", label: "Parts arrived" },
  { value: "IN_PROGRESS", label: "Repair started" },
  { value: "COMPLETED", label: "Ready for pickup" },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Every column can be ordered by clicking its title. Sorting happens in
// memory: half these keys (profit, owner, device) are computed rather than
// stored, so a database ORDER BY couldn't express them anyway.
const SORTS = {
  ticket: "Ticket",
  customer: "Customer",
  device: "Device",
  issue: "Issue",
  status: "Status",
  profit: "Profit",
  date: "Date",
  bill: "Bill",
} as const;

type SortKey = keyof typeof SORTS;

const DEFAULT_SORT: SortKey = "date";
const DEFAULT_DIR: "asc" | "desc" = "desc";

type Row = {
  id: string;
  seq: number;
  ticketNumber: string;
  owner: string;
  email: string | null;
  device: string;
  deviceType: string;
  issueTitle: string;
  status: TicketStatus;
  chip: { label: string; className: string } | null;
  profit: number | null;
  billTotal: number | null;
  createdAt: Date;
};

function compare(a: Row, b: Row, key: SortKey): number {
  // Nulls always sort last, whichever direction is chosen — a missing figure
  // isn't "smallest", it's absent.
  const nullsLast = (x: number | null, y: number | null) => {
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y;
  };
  switch (key) {
    case "ticket":
      return a.seq - b.seq;
    case "customer":
      return a.owner.localeCompare(b.owner);
    case "device":
      return a.device.localeCompare(b.device);
    case "issue":
      return a.issueTitle.localeCompare(b.issueTitle);
    case "status":
      // Pipeline order, not alphabetical — "Diagnosing" before "Completed"
      // is what the shop means by sorting on status.
      return (
        STATUS_PIPELINE.indexOf(a.status) - STATUS_PIPELINE.indexOf(b.status)
      );
    case "profit":
      return nullsLast(a.profit, b.profit);
    case "bill":
      return nullsLast(a.billTotal, b.billTotal);
    default:
      return a.createdAt.getTime() - b.createdAt.getTime();
  }
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (
    parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}

// "3d ago" under the date — how long something has been sitting is the part
// an admin scans for.
function relativeDays(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

function SortHeader({
  column,
  active,
  dir,
  status,
  className,
  align = "left",
}: {
  column: SortKey;
  active: boolean;
  dir: "asc" | "desc";
  status?: string;
  className?: string;
  align?: "left" | "right";
}) {
  // Clicking the active column flips direction; a new column starts on the
  // direction that's most useful for it (newest / biggest first for numbers).
  const nextDir = active
    ? dir === "asc"
      ? "desc"
      : "asc"
    : column === "date" || column === "profit" || column === "bill"
      ? "desc"
      : "asc";

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("sort", column);
  params.set("dir", nextDir);

  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <TableHead
      className={cn(
        "h-11 px-3 text-[11px] font-semibold tracking-wider uppercase",
        align === "right" && "text-right",
        className,
      )}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={`/admin/tickets?${params.toString()}`}
        scroll={false}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-md px-1 py-1 transition-colors",
          align === "right" && "flex-row-reverse",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {SORTS[column]}
        <Icon
          className={cn(
            "size-3 shrink-0 transition-opacity",
            active
              ? "text-primary opacity-100"
              : "opacity-0 group-hover:opacity-60",
          )}
        />
      </Link>
    </TableHead>
  );
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string }>;
}) {
  const { status, sort, dir } = await searchParams;
  const unpaidView = status === "unpaid";
  const filter =
    status && status !== "all" && status in STATUS_META
      ? (status as TicketStatus)
      : undefined;

  const sortKey: SortKey =
    sort && sort in SORTS ? (sort as SortKey) : DEFAULT_SORT;
  const sortDir: "asc" | "desc" = dir === "asc" || dir === "desc" ? dir : DEFAULT_DIR;

  const tickets = await prisma.repairTicket.findMany({
    // Legacy tickets may still sit at READY_FOR_PICKUP — same shelf as
    // COMPLETED now that the pipeline has no separate ready step.
    where: unpaidView
      ? {
          // Billed but nothing recorded against it yet.
          finalCost: { not: null },
          paidAt: null,
          paidAmount: null,
          status: { not: "CANCELLED" },
          payments: { none: { status: "PAID" } },
        }
      : filter
        ? filter === "COMPLETED"
          ? { status: { in: ["COMPLETED", "READY_FOR_PICKUP"] } }
          : { status: filter }
        : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, email: true } },
      issues: { select: { id: true, status: true } },
    },
  });

  const deviceLabel = Object.fromEntries(
    DEVICE_TYPES.map((d) => [d.value, d.label]),
  );

  const rows: Row[] = tickets.map((ticket) => {
    const paid = ticket.paidAmount ? Number(ticket.paidAmount) : null;
    const parts = ticket.partsCost ? Number(ticket.partsCost) : null;
    return {
      id: ticket.id,
      seq: ticket.seq,
      ticketNumber: ticket.ticketNumber,
      owner: ticket.customer?.name ?? ticket.customerName ?? "—",
      email: ticket.customer?.email ?? null,
      device:
        [ticket.brand, ticket.model].filter(Boolean).join(" ") ||
        deviceLabel[ticket.deviceType] ||
        "—",
      deviceType: ticket.deviceType,
      issueTitle: ticket.issueTitle,
      status: ticket.status,
      chip: issueChip(ticket.issues, ticket.refunded),
      profit:
        paid !== null || parts !== null ? (paid ?? 0) - (parts ?? 0) : null,
      billTotal: ticket.finalCost
        ? Number(ticket.finalCost)
        : paid !== null
          ? paid
          : null,
      createdAt: ticket.createdAt,
    };
  });

  rows.sort((a, b) => {
    const result = compare(a, b, sortKey);
    // Ties fall back to newest first so the order never looks arbitrary.
    if (result === 0) return b.createdAt.getTime() - a.createdAt.getTime();
    return sortDir === "asc" ? result : -result;
  });

  const headerProps = { active: false, dir: sortDir, status } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Repairs
          </h1>
          <p className="mt-1 text-muted-foreground">
            {rows.length} repair{rows.length === 1 ? "" : "s"}
            {unpaidView
              ? " · billed but unpaid"
              : filter
                ? ` · ${doneLabel(filter)}`
                : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tickets/new">
            <Plus className="size-4" /> New repair log
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? "all") === f.value;
          const params = new URLSearchParams();
          if (f.value !== "all") params.set("status", f.value);
          if (sort) params.set("sort", sort);
          if (dir) params.set("dir", dir);
          const query = params.toString();
          return (
            <Link
              key={f.value}
              href={query ? `/admin/tickets?${query}` : "/admin/tickets"}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200",
                active
                  ? "border-primary/40 bg-primary/15 font-medium text-primary"
                  : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground",
                f.value === "unpaid" &&
                  !active &&
                  "border-warning/30 text-warning hover:border-warning/50",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <SortHeader
                {...headerProps}
                column="ticket"
                active={sortKey === "ticket"}
              />
              <SortHeader
                {...headerProps}
                column="customer"
                active={sortKey === "customer"}
              />
              <SortHeader
                {...headerProps}
                column="device"
                active={sortKey === "device"}
              />
              <SortHeader
                {...headerProps}
                column="issue"
                active={sortKey === "issue"}
              />
              <SortHeader
                {...headerProps}
                column="status"
                active={sortKey === "status"}
              />
              <SortHeader
                {...headerProps}
                column="profit"
                active={sortKey === "profit"}
                align="right"
              />
              <SortHeader
                {...headerProps}
                column="date"
                active={sortKey === "date"}
                align="right"
              />
              <SortHeader
                {...headerProps}
                column="bill"
                active={sortKey === "bill"}
                align="right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="py-14 text-center text-muted-foreground"
                >
                  {unpaidView
                    ? "Every bill is settled — nothing outstanding."
                    : "No repairs match this filter."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <LinkedTableRow
                  key={row.id}
                  href={`/admin/tickets/${row.id}`}
                  className="group/row border-border/60 transition-colors hover:bg-accent/40"
                >
                  <TableCell className="py-3.5 pr-3 pl-3">
                    <div className="flex items-center gap-2.5">
                      {/* Status colour as a spine down the row's left edge */}
                      <span
                        className={cn(
                          "h-8 w-1 shrink-0 rounded-full",
                          STATUS_META[row.status].dotClassName,
                        )}
                        aria-hidden
                      />
                      <Link
                        href={`/admin/tickets/${row.id}`}
                        className="font-mono text-xs font-medium transition-colors group-hover/row:text-primary"
                      >
                        {row.ticketNumber}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
                        {initialsOf(row.owner)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.owner}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.email ?? "walk-in"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <p className="font-medium">{row.device}</p>
                    <p className="text-xs text-muted-foreground">
                      {deviceLabel[row.deviceType] ?? "Device"}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-56 py-3.5 text-muted-foreground">
                    <p className="truncate">{row.issueTitle}</p>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={row.status} />
                      {row.chip ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                            row.chip.className,
                          )}
                        >
                          {row.chip.label}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-right">
                    {row.profit !== null ? (
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                          row.profit > 0 && "bg-success/10 text-success",
                          row.profit < 0 && "bg-destructive/10 text-destructive",
                          row.profit === 0 && "bg-muted text-muted-foreground",
                        )}
                      >
                        {formatLKR(row.profit)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 text-right">
                    <p className="text-xs whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </p>
                    <p className="text-[11px] whitespace-nowrap text-muted-foreground">
                      {relativeDays(row.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="py-3.5 pr-3 text-right">
                    {row.billTotal !== null ? (
                      <Link
                        href={`/bill/${row.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <Receipt className="size-3.5" />
                        {formatLKR(row.billTotal)}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </LinkedTableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
