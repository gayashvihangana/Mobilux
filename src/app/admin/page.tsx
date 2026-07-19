import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  Percent,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CountUp } from "@/components/count-up";
import { LinkedTableRow } from "@/components/linked-table-row";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_META, STATUS_PIPELINE } from "@/lib/status";
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
  title: "Admin overview",
};

const ACTIVE_STATUSES = [
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
] as const;

const SUCCESS_STATUSES = ["COMPLETED", "READY_FOR_PICKUP", "PICKED_UP"] as const;

export default async function AdminOverviewPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    activeCount,
    readyCount,
    customerCount,
    recentTickets,
    statusCounts,
    financeTickets,
    paidByTicket,
  ] = await Promise.all([
    prisma.repairTicket.count({
      where: { status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.repairTicket.count({
      where: { status: { in: ["COMPLETED", "READY_FOR_PICKUP"] } },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.repairTicket.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
    prisma.repairTicket.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.repairTicket.findMany({
      select: {
        id: true,
        status: true,
        paidAmount: true,
        partsCost: true,
        completedAt: true,
      },
    }),
    prisma.payment.groupBy({
      by: ["ticketId"],
      where: { status: "PAID", ticketId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  // ── Financials (repairs only) ──────────────────────────────────
  // Revenue per ticket: verified online payments first, otherwise the
  // shop's own paid-amount record — same preference the bill uses.
  const paidPaymentByTicket = new Map(
    paidByTicket.map((p) => [p.ticketId as string, Number(p._sum.amount ?? 0)]),
  );

  let revenue = 0;
  let revenueThisMonth = 0;
  let costs = 0;
  let costsThisMonth = 0;

  for (const t of financeTickets) {
    const paymentSum = paidPaymentByTicket.get(t.id) ?? 0;
    const ticketRevenue =
      paymentSum > 0 ? paymentSum : t.paidAmount ? Number(t.paidAmount) : 0;
    const ticketCost = t.partsCost ? Number(t.partsCost) : 0;
    revenue += ticketRevenue;
    costs += ticketCost;
    if (t.completedAt && t.completedAt >= monthStart) {
      revenueThisMonth += ticketRevenue;
      costsThisMonth += ticketCost;
    }
  }

  const profit = revenue - costs;
  const profitThisMonth = revenueThisMonth - costsThisMonth;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // ── Repair outcomes ────────────────────────────────────────────
  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count]),
  );
  const totalTickets = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const succeeded = SUCCESS_STATUSES.reduce(
    (sum, s) => sum + (countByStatus[s] ?? 0),
    0,
  );
  const cancelled = countByStatus["CANCELLED"] ?? 0;
  const closed = succeeded + cancelled;
  const successRate = closed > 0 ? (succeeded / closed) * 100 : null;
  const completedThisMonth = financeTickets.filter(
    (t) => t.completedAt && t.completedAt >= monthStart,
  ).length;
  const paidRepairs = financeTickets.filter(
    (t) =>
      (paidPaymentByTicket.get(t.id) ?? 0) > 0 ||
      (t.paidAmount !== null && Number(t.paidAmount) > 0),
  ).length;
  const avgPerRepair = paidRepairs > 0 ? revenue / paidRepairs : 0;

  const pipelineTotal = STATUS_PIPELINE.reduce(
    (sum, s) => sum + (countByStatus[s] ?? 0),
    0,
  );

  const profitTone = profit >= 0 ? "text-success" : "text-destructive";
  const financeStats = [
    {
      label: "Total revenue",
      value: <CountUp value={revenue} format="lkr" />,
      sub: `${formatLKR(revenueThisMonth)} this month`,
      icon: Banknote,
      className: "text-success",
      valueClassName: "text-success",
    },
    {
      label: "Parts & costs",
      value: <CountUp value={costs} format="lkr" />,
      sub: `${formatLKR(costsThisMonth)} this month`,
      icon: Wallet,
      className: "text-warning",
      valueClassName: "",
    },
    {
      label: "Net profit",
      value: <CountUp value={profit} format="lkr" />,
      sub: `${formatLKR(profitThisMonth)} this month`,
      icon: TrendingUp,
      className: profitTone,
      valueClassName: profitTone,
    },
    {
      label: "Profit margin",
      value: <CountUp value={profitMargin} format="percent1" />,
      sub: "of revenue kept as profit",
      icon: Percent,
      className: profitTone,
      valueClassName: profitTone,
    },
  ];

  const repairStats = [
    {
      label: "Total repairs",
      value: <CountUp value={totalTickets} />,
      sub: `${completedThisMonth} completed this month`,
      icon: Smartphone,
      className: "text-primary",
      valueClassName: "",
    },
    {
      label: "Repaired successfully",
      value: <CountUp value={succeeded} />,
      sub: cancelled > 0 ? `${cancelled} cancelled` : "no cancellations",
      icon: CheckCircle2,
      className: "text-success",
      valueClassName: "text-success",
    },
    {
      label: "Success rate",
      value:
        successRate === null ? (
          "—"
        ) : (
          <CountUp value={successRate} format="percent1" />
        ),
      sub: "of finished repairs succeeded",
      icon: Target,
      className: "text-success",
      valueClassName: "text-success",
    },
    {
      label: "Avg. per repair",
      value: <CountUp value={avgPerRepair} format="lkr" />,
      sub: `across ${paidRepairs} paid repair${paidRepairs === 1 ? "" : "s"}`,
      icon: Banknote,
      className: "text-primary",
      valueClassName: "",
    },
  ];

  const opsStats = [
    { label: "Active repairs", value: <CountUp value={activeCount} />, icon: Wrench, className: "text-primary" },
    { label: "Awaiting pickup", value: <CountUp value={readyCount} />, icon: Clock, className: "text-warning" },
    { label: "Completed this month", value: <CountUp value={completedThisMonth} />, icon: CheckCircle2, className: "text-success" },
    { label: "Customers", value: <CountUp value={customerCount} />, icon: Users, className: "text-info" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          What&apos;s happening at Mobilux today.
        </p>
      </div>

      {/* Financials */}
      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">Business</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {financeStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={cn("size-4", stat.className)} />
              </div>
              <p
                className={cn(
                  "font-display mt-2 text-2xl font-bold tracking-tight",
                  stat.valueClassName,
                )}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Repair outcomes */}
      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">Repairs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {repairStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={cn("size-4", stat.className)} />
              </div>
              <p
                className={cn(
                  "font-display mt-2 text-2xl font-bold tracking-tight",
                  stat.valueClassName,
                )}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Today */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {opsStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("size-4", stat.className)} />
            </div>
            <p className="font-display mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline breakdown */}
      {pipelineTotal > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Pipeline</h2>
          <div className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
            {STATUS_PIPELINE.map((status) => {
              const count = countByStatus[status] ?? 0;
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  className={cn("h-full", STATUS_META[status].dotClassName)}
                  style={{ width: `${(count / pipelineTotal) * 100}%` }}
                  title={`${STATUS_META[status].label}: ${count}`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {STATUS_PIPELINE.map((status) => {
              const count = countByStatus[status] ?? 0;
              if (count === 0) return null;
              return (
                <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", STATUS_META[status].dotClassName)} />
                  {STATUS_META[status].label} · {count}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Recent tickets */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent repairs</h2>
          <Link
            href="/admin/tickets"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            All repairs <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Repair</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No repairs yet — they&apos;ll appear here as customers submit
                    repair requests.
                  </TableCell>
                </TableRow>
              ) : (
                recentTickets.map((ticket) => (
                  <LinkedTableRow
                    key={ticket.id}
                    href={`/admin/tickets/${ticket.id}`}
                  >
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="hover:underline"
                      >
                        {ticket.ticketNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {ticket.customer?.name ?? ticket.customerName ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {[ticket.brand, ticket.model].filter(Boolean).join(" ") ||
                        "—"}
                    </TableCell>
                    <TableCell className="max-w-50 truncate text-muted-foreground">
                      {ticket.issueTitle}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(ticket.createdAt)}
                    </TableCell>
                  </LinkedTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
