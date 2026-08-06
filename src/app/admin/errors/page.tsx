import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeAlert,
  CheckCircle2,
  Clock,
  Percent,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import type { RepairIssueStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseParts, partsTotalCost, type PartEntry } from "@/lib/parts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import { requirePermission } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Bench errors",
};

const STATUS_META: Record<
  RepairIssueStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Awaiting customer",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  ACCEPTED: {
    label: "Fixed free",
    className: "border-success/30 bg-success/10 text-success",
  },
  DECLINED: {
    label: "Cancelled · refund",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

type MonthBucket = { key: string; label: string; count: number; cost: number };

// Compact bar row — the trend here is about "how often", so a simple bar per
// month reads better than a full axis-and-grid chart.
function MonthTrend({ months }: { months: MonthBucket[] }) {
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      {months.map((m) => (
        <div key={m.key} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {m.count > 0 ? `${m.count} · ${formatLKR(m.cost)}` : "0"}
          </span>
          <div
            className="flex w-full items-end justify-center"
            style={{ height: "96px" }}
          >
            <div
              className={cn(
                "w-full max-w-8 rounded-t-md transition-all duration-500 ease-out",
                m.count > 0 ? "bg-warning/70 group-hover:bg-warning" : "bg-border",
              )}
              style={{
                height: m.count > 0 ? `${(m.count / max) * 100}%` : "2px",
              }}
              title={`${m.label}: ${m.count} issue${m.count === 1 ? "" : "s"} · ${formatLKR(m.cost)}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function RankedBars({
  items,
  unit,
  tone = "warning",
}: {
  items: { label: string; count: number; cost?: number }[];
  unit: string;
  tone?: "warning" | "primary";
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing recorded yet.
      </p>
    );
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm">{item.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.count} {unit}
              {item.count === 1 ? "" : "s"}
              {item.cost !== undefined && item.cost > 0
                ? ` · ${formatLKR(item.cost)}`
                : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                tone === "warning" ? "bg-warning" : "bg-primary",
              )}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminErrorsPage() {
  await requirePermission("report:read");
  const [issues, ticketCount] = await Promise.all([
    prisma.repairIssue.findMany({
      orderBy: { reportedAt: "desc" },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            brand: true,
            model: true,
            customerName: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.repairTicket.count(),
  ]);

  const rows = issues.map((issue) => {
    const parts = parseParts(issue.parts);
    return { ...issue, partsList: parts, cost: partsTotalCost(parts) };
  });

  const affectedTickets = new Set(rows.map((r) => r.ticketId)).size;
  // "Error rate" = the share of repairs where something went wrong on our
  // side. Counted per repair, not per issue, so one bad job with three
  // mishaps doesn't read as three bad jobs.
  const errorRate = ticketCount > 0 ? (affectedTickets / ticketCount) * 100 : 0;
  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
  const countOf = (status: RepairIssueStatus) =>
    rows.filter((r) => r.status === status).length;

  const stats = [
    {
      label: "Errors reported",
      value: String(rows.length),
      hint: `${affectedTickets} repair${affectedTickets === 1 ? "" : "s"} affected`,
      icon: TriangleAlert,
      className: "text-warning",
    },
    {
      label: "Error rate",
      value: `${errorRate.toFixed(1)}%`,
      hint: `of ${ticketCount} repair${ticketCount === 1 ? "" : "s"} logged`,
      icon: Percent,
      className: "text-warning",
    },
    {
      label: "Cost to us",
      value: formatLKR(totalCost),
      hint: "parts bought to put them right",
      icon: Wallet,
      className: "text-destructive",
    },
    {
      label: "Fixed free",
      value: String(countOf("ACCEPTED")),
      hint: `${countOf("DECLINED")} cancelled · ${countOf("PENDING")} awaiting`,
      icon: CheckCircle2,
      className: "text-success",
    },
  ];

  // Last 12 calendar months, oldest first.
  const now = new Date();
  const monthFormat = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "Asia/Colombo",
  });
  const months: MonthBucket[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: monthFormat.format(d),
      count: 0,
      cost: 0,
    };
  });
  const bucketByKey = new Map(months.map((m) => [m.key, m]));
  for (const r of rows) {
    const bucket = bucketByKey.get(
      `${r.reportedAt.getFullYear()}-${r.reportedAt.getMonth()}`,
    );
    if (!bucket) continue;
    bucket.count += 1;
    bucket.cost += r.cost;
  }

  // What we end up replacing, and who we buy it from.
  const tally = (
    pick: (p: PartEntry) => string | undefined,
  ): { label: string; count: number; cost: number }[] => {
    const map = new Map<string, { label: string; count: number; cost: number }>();
    for (const r of rows) {
      for (const part of r.partsList) {
        const raw = pick(part)?.trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        const entry = map.get(key);
        if (entry) {
          entry.count += 1;
          entry.cost += part.cost ?? 0;
        } else {
          map.set(key, { label: raw, count: 1, cost: part.cost ?? 0 });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  };
  const topParts = tally((p) => p.part);
  const topSuppliers = tally((p) => p.supplier);

  const outcomes = (["ACCEPTED", "DECLINED", "PENDING"] as const)
    .map((status) => ({
      label: STATUS_META[status].label,
      count: countOf(status),
      cost: rows
        .filter((r) => r.status === status)
        .reduce((sum, r) => sum + r.cost, 0),
    }))
    .filter((o) => o.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Bench errors
        </h1>
        <p className="mt-1 text-muted-foreground">
          Everything that went wrong on our side of the bench — how often, what
          it cost us, and how it ended. Nothing here is ever shown to customers
          beyond the issue they were already told about.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("size-4", stat.className)} />
            </div>
            <p className="font-display mt-2 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Errors by month</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          When they happened, and what each month cost in replacement parts.
        </p>
        <MonthTrend months={months} />
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">How they ended</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            The customer&apos;s decision on each report.
          </p>
          <RankedBars items={outcomes} unit="error" />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">
            Parts we replaced
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            What we most often had to buy again.
          </p>
          <RankedBars items={topParts} unit="time" />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Suppliers used</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Where the replacements came from.
          </p>
          <RankedBars items={topSuppliers} unit="part" tone="primary" />
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Every error</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Repair</TableHead>
                <TableHead>What happened</TableHead>
                <TableHead>Free fix</TableHead>
                <TableHead>Parts</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No errors logged — clean sheet so far.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const meta = STATUS_META[row.status];
                  const device =
                    [row.ticket.brand, row.ticket.model]
                      .filter(Boolean)
                      .join(" ") || "Device";
                  const owner =
                    row.ticket.customer?.name ??
                    row.ticket.customerName ??
                    "Walk-in";
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tickets/${row.ticketId}`}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {row.ticket.ticketNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {device} · {owner}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <p className="line-clamp-2 text-sm">{row.note}</p>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {row.solution ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-48">
                        {row.partsList.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            none recorded
                          </span>
                        ) : (
                          <ul className="space-y-0.5 text-xs">
                            {row.partsList.map((part, i) => (
                              <li key={`${part.part}-${i}`}>
                                <span className="font-medium">{part.part}</span>
                                {part.supplier ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {part.supplier}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                            meta.className,
                          )}
                        >
                          {row.status === "PENDING" ? (
                            <Clock className="size-3" />
                          ) : row.status === "ACCEPTED" ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <BadgeAlert className="size-3" />
                          )}
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {row.cost > 0 ? formatLKR(row.cost) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm whitespace-nowrap text-muted-foreground">
                        {formatDate(row.reportedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
