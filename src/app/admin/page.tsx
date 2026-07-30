import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Inbox, Users, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkedTableRow } from "@/components/linked-table-row";
import { StatusBadge } from "@/components/status-badge";
import { doneLabel, STATUS_META, STATUS_PIPELINE } from "@/lib/status";
import { issuePartsCostOf, parseParts } from "@/lib/parts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import {
  OverviewDashboard,
  type Kpi,
  type MonthPoint,
} from "./overview-dashboard";

export const metadata: Metadata = {
  title: "Admin overview",
};

const ACTIVE_STATUSES = [
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
] as const;

const SUCCESS_STATUSES = ["COMPLETED", "READY_FOR_PICKUP", "PICKED_UP"] as const;

const pct = (value: number) => `${value.toFixed(1)}%`;
const int = (value: number) => Math.round(value).toLocaleString("en-LK");

export default async function AdminOverviewPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    pendingCount,
    activeCount,
    readyCount,
    customerCount,
    recentTickets,
    statusCounts,
    financeTickets,
    paidByTicket,
    customerDates,
    issues,
  ] = await Promise.all([
    prisma.repairTicket.count({ where: { status: "SUBMITTED" } }),
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
    prisma.repairTicket.groupBy({ by: ["status"], _count: true }),
    prisma.repairTicket.findMany({
      select: {
        id: true,
        status: true,
        paidAmount: true,
        partsCost: true,
        parts: true,
        createdAt: true,
        completedAt: true,
        issues: { select: { parts: true } },
      },
    }),
    prisma.payment.groupBy({
      by: ["ticketId"],
      where: { status: "PAID", ticketId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { createdAt: true },
    }),
    prisma.repairIssue.findMany({
      select: { ticketId: true, status: true, parts: true, reportedAt: true },
    }),
  ]);

  // ── Financials (repairs only) ──────────────────────────────────
  // Revenue per ticket: verified online payments first, otherwise the
  // shop's own paid-amount record — same preference the bill uses.
  const paidPaymentByTicket = new Map(
    paidByTicket.map((p) => [p.ticketId as string, Number(p._sum.amount ?? 0)]),
  );
  const revenueOf = (t: (typeof financeTickets)[number]) => {
    const paymentSum = paidPaymentByTicket.get(t.id) ?? 0;
    return paymentSum > 0 ? paymentSum : t.paidAmount ? Number(t.paidAmount) : 0;
  };

  let revenue = 0;
  let revenueThisMonth = 0;
  let costs = 0;
  let costsThisMonth = 0;
  // Split the cost side: parts for the repair itself vs parts we had to buy
  // because something went wrong on our bench.
  let repairPartsCost = 0;
  let benchErrorCost = 0;

  for (const t of financeTickets) {
    const ticketRevenue = revenueOf(t);
    const ticketCost = t.partsCost ? Number(t.partsCost) : 0;
    revenue += ticketRevenue;
    costs += ticketCost;
    const issueCost = issuePartsCostOf(t.issues);
    benchErrorCost += issueCost;
    repairPartsCost += Math.max(0, ticketCost - issueCost);
    if (t.completedAt && t.completedAt >= monthStart) {
      revenueThisMonth += ticketRevenue;
      costsThisMonth += ticketCost;
    }
  }

  const profit = revenue - costs;
  const profitThisMonth = revenueThisMonth - costsThisMonth;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // ── Monthly series — the spine of every dialog chart ───────────
  const monthFormat = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "Asia/Colombo",
  });
  const months: MonthPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: monthFormat.format(d),
      revenue: 0,
      costs: 0,
      profit: 0,
      completed: 0,
      created: 0,
      customers: 0,
      errors: 0,
    };
  });
  const bucketOf = (date: Date) =>
    months.find((m) => m.key === `${date.getFullYear()}-${date.getMonth()}`);

  for (const t of financeTickets) {
    const created = bucketOf(t.createdAt);
    if (created) created.created += 1;
    // Money lands in the month the repair finished — that's when it's earned.
    const earned = bucketOf(t.completedAt ?? t.createdAt);
    if (earned) {
      earned.revenue += revenueOf(t);
      earned.costs += t.partsCost ? Number(t.partsCost) : 0;
    }
    if (t.completedAt) {
      const done = bucketOf(t.completedAt);
      if (done) done.completed += 1;
    }
  }
  for (const c of customerDates) {
    const bucket = bucketOf(c.createdAt);
    if (bucket) bucket.customers += 1;
  }
  for (const issue of issues) {
    const bucket = bucketOf(issue.reportedAt);
    if (bucket) bucket.errors += 1;
  }
  for (const m of months) m.profit = m.revenue - m.costs;

  const thisMonthBucket = months[months.length - 1];
  const lastMonthBucket = months[months.length - 2];
  const bestMonth = [...months].sort((a, b) => b.profit - a.profit)[0];
  const avgMonthlyProfit =
    months.reduce((sum, m) => sum + m.profit, 0) / months.length;
  const profitLastMonth = lastMonthBucket?.profit ?? 0;

  // ── Repair outcomes ───────────────────────────────────────────
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
  const completedThisMonth = thisMonthBucket?.completed ?? 0;
  const paidRepairs = financeTickets.filter(
    (t) => revenueOf(t) > 0,
  ).length;
  const avgPerRepair = paidRepairs > 0 ? revenue / paidRepairs : 0;
  const pipelineTotal = STATUS_PIPELINE.reduce(
    (sum, s) => sum + (countByStatus[s] ?? 0),
    0,
  );

  // ── Bench errors ──────────────────────────────────────────────
  const affectedTickets = new Set(issues.map((i) => i.ticketId)).size;
  const errorRate =
    totalTickets > 0 ? (affectedTickets / totalTickets) * 100 : 0;
  const errorsThisMonth = thisMonthBucket?.errors ?? 0;

  // Which parts eat the most money, for the costs dialog.
  const partSpend = new Map<string, number>();
  for (const t of financeTickets) {
    for (const part of parseParts(t.parts)) {
      if (!part.cost) continue;
      const key = part.part.toLowerCase();
      partSpend.set(key, (partSpend.get(key) ?? 0) + part.cost);
    }
  }
  const topPartSpend = [...partSpend.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const pipelineBreakdown = STATUS_PIPELINE.map((status) => ({
    label: doneLabel(status),
    value: countByStatus[status] ?? 0,
  })).filter((s) => s.value > 0);

  const profitTone = profit >= 0 ? "success" : "destructive";

  // The hero's own dialog — the full profit story.
  const profitKpi: Kpi = {
    id: "profit",
    label: "Net profit",
    value: formatLKR(profit),
    raw: profit,
    sub: `${formatLKR(profitThisMonth)} this month`,
    icon: "trendingUp",
    tone: profitTone,
    detail: {
      description:
        "What's left after parts and the cost of putting our own mistakes right. Revenue counts verified online payments first, then what the shop recorded as paid.",
      field: "profit",
      seriesLabel: "Profit by month",
      format: "lkr",
      stats: [
        { label: "This month", value: formatLKR(profitThisMonth) },
        { label: "Last month", value: formatLKR(profitLastMonth) },
        { label: "Monthly average", value: formatLKR(avgMonthlyProfit) },
        {
          label: "Best month",
          value: bestMonth ? `${bestMonth.label} · ${formatLKR(bestMonth.profit)}` : "—",
        },
      ],
      breakdown: [
        { label: "Revenue", value: revenue },
        { label: "Repair parts", value: repairPartsCost },
        { label: "Fixing our own mistakes", value: benchErrorCost },
        { label: "Profit", value: profit },
      ],
      breakdownFormat: "lkr",
      link: { href: "/admin/reports", label: "Open full reports" },
    },
  };

  const kpis: Kpi[] = [
    {
      id: "revenue",
      label: "Revenue",
      value: formatLKR(revenue),
      raw: revenue,
      sub: `${formatLKR(revenueThisMonth)} this month`,
      icon: "banknote",
      tone: "success",
      detail: {
        description:
          "Everything customers have paid for repairs, counted in the month the repair finished.",
        field: "revenue",
        seriesLabel: "Revenue by month",
        format: "lkr",
        stats: [
          { label: "This month", value: formatLKR(revenueThisMonth) },
          { label: "Last month", value: formatLKR(lastMonthBucket?.revenue ?? 0) },
          { label: "Paid repairs", value: int(paidRepairs) },
          { label: "Avg. per repair", value: formatLKR(avgPerRepair) },
        ],
        link: { href: "/admin/payments", label: "Review payments" },
      },
    },
    {
      id: "costs",
      label: "Parts & costs",
      value: formatLKR(costs),
      raw: costs,
      sub: `${formatLKR(costsThisMonth)} this month`,
      icon: "wallet",
      tone: "warning",
      detail: {
        description:
          "What the shop spent on parts — the repair's own parts plus anything bought to fix a mistake on the bench.",
        field: "costs",
        seriesLabel: "Costs by month",
        format: "lkr",
        stats: [
          { label: "Repair parts", value: formatLKR(repairPartsCost) },
          { label: "Bench errors", value: formatLKR(benchErrorCost) },
          {
            label: "Cost ratio",
            value: revenue > 0 ? pct((costs / revenue) * 100) : "—",
          },
        ],
        breakdown:
          topPartSpend.length > 0
            ? topPartSpend
            : [
                { label: "Repair parts", value: repairPartsCost },
                { label: "Bench errors", value: benchErrorCost },
              ],
        breakdownFormat: "lkr",
        link: { href: "/admin/errors", label: "See what errors cost us" },
      },
    },
    {
      id: "margin",
      label: "Profit margin",
      value: pct(profitMargin),
      raw: profitMargin,
      sub: "of revenue kept as profit",
      icon: "percent",
      tone: profitTone,
      detail: {
        description:
          "The share of revenue left after costs. The chart shows profit itself — margin only means something next to the money behind it.",
        field: "profit",
        seriesLabel: "Profit by month",
        format: "lkr",
        stats: [
          { label: "Revenue", value: formatLKR(revenue) },
          { label: "Costs", value: formatLKR(costs) },
          { label: "Profit", value: formatLKR(profit) },
        ],
        link: { href: "/admin/reports", label: "Open full reports" },
      },
    },
    {
      id: "avg",
      label: "Avg. per repair",
      value: formatLKR(avgPerRepair),
      raw: avgPerRepair,
      sub: `across ${paidRepairs} paid repair${paidRepairs === 1 ? "" : "s"}`,
      icon: "banknote",
      tone: "primary",
      detail: {
        description:
          "Average revenue per repair that has actually been paid for.",
        field: "revenue",
        seriesLabel: "Revenue by month",
        format: "lkr",
        stats: [
          { label: "Paid repairs", value: int(paidRepairs) },
          { label: "Total revenue", value: formatLKR(revenue) },
          {
            label: "Completed this month",
            value: int(completedThisMonth),
          },
        ],
        link: { href: "/admin/tickets", label: "Browse repairs" },
      },
    },
    {
      id: "repairs",
      label: "Total repairs",
      value: int(totalTickets),
      raw: totalTickets,
      sub: `${completedThisMonth} completed this month`,
      icon: "smartphone",
      tone: "primary",
      detail: {
        description: "Every repair logged, however it arrived.",
        field: "created",
        seriesLabel: "New repairs by month",
        format: "int",
        stats: [
          { label: "In progress", value: int(activeCount) },
          { label: "Awaiting pickup", value: int(readyCount) },
          { label: "Needs confirmation", value: int(pendingCount) },
        ],
        breakdown: pipelineBreakdown,
        breakdownFormat: "int",
        link: { href: "/admin/tickets", label: "Browse repairs" },
      },
    },
    {
      id: "success",
      label: "Success rate",
      value: successRate === null ? "—" : pct(successRate),
      raw: successRate ?? 0,
      sub: `${succeeded} succeeded · ${cancelled} cancelled`,
      icon: "target",
      tone: "success",
      detail: {
        description:
          "Of the repairs that reached an end, the share that ended fixed rather than cancelled.",
        field: "completed",
        seriesLabel: "Repairs completed by month",
        format: "int",
        stats: [
          { label: "Succeeded", value: int(succeeded) },
          { label: "Cancelled", value: int(cancelled) },
          { label: "Still open", value: int(totalTickets - closed) },
        ],
        breakdown: [
          { label: "Repaired", value: succeeded },
          { label: "Cancelled", value: cancelled },
        ],
        breakdownFormat: "int",
        link: { href: "/admin/tickets", label: "Browse repairs" },
      },
    },
    {
      id: "errors",
      label: "Bench errors",
      value: int(issues.length),
      raw: issues.length,
      sub: `${pct(errorRate)} of repairs · ${formatLKR(benchErrorCost)} cost`,
      icon: "triangleAlert",
      tone: issues.length > 0 ? "warning" : "success",
      detail: {
        description:
          "Times something went wrong on our side of the bench, and what putting it right cost us in parts.",
        field: "errors",
        seriesLabel: "Errors reported by month",
        format: "int",
        stats: [
          { label: "This month", value: int(errorsThisMonth) },
          { label: "Repairs affected", value: int(affectedTickets) },
          { label: "Error rate", value: pct(errorRate) },
          { label: "Cost to us", value: formatLKR(benchErrorCost) },
        ],
        breakdown: [
          {
            label: "Fixed free",
            value: issues.filter((i) => i.status === "ACCEPTED").length,
          },
          {
            label: "Cancelled with refund",
            value: issues.filter((i) => i.status === "DECLINED").length,
          },
          {
            label: "Awaiting customer",
            value: issues.filter((i) => i.status === "PENDING").length,
          },
        ],
        breakdownFormat: "int",
        link: { href: "/admin/errors", label: "Open bench errors" },
      },
    },
    {
      id: "customers",
      label: "Customers",
      value: int(customerCount),
      raw: customerCount,
      sub: `${thisMonthBucket?.customers ?? 0} joined this month`,
      icon: "users",
      tone: "info",
      detail: {
        description: "Registered customer accounts, by the month they joined.",
        field: "customers",
        seriesLabel: "New customers by month",
        format: "int",
        stats: [
          { label: "This month", value: int(thisMonthBucket?.customers ?? 0) },
          { label: "Last month", value: int(lastMonthBucket?.customers ?? 0) },
          {
            label: "Repairs per customer",
            value:
              customerCount > 0
                ? (totalTickets / customerCount).toFixed(1)
                : "—",
          },
        ],
        link: { href: "/admin/customers", label: "Open customers" },
      },
    },
  ];

  // Small "right now" links — navigation, not insight, so they stay links.
  const todayLinks = [
    {
      label: "Needs confirmation",
      value: pendingCount,
      href: "/admin/tickets?status=SUBMITTED",
      icon: Inbox,
      tone: pendingCount > 0 ? "text-warning" : "text-muted-foreground",
      highlight: pendingCount > 0,
    },
    {
      label: "Active repairs",
      value: activeCount,
      href: "/admin/tickets",
      icon: Wrench,
      tone: "text-primary",
      highlight: false,
    },
    {
      label: "Awaiting pickup",
      value: readyCount,
      href: "/admin/tickets?status=COMPLETED",
      icon: Clock,
      tone: "text-warning",
      highlight: false,
    },
    {
      label: "Customers",
      value: customerCount,
      href: "/admin/customers",
      icon: Users,
      tone: "text-info",
      highlight: false,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          How the shop is doing — tap any card for the trend behind it.
        </p>
      </div>

      <OverviewDashboard
        hero={{
          profit,
          profitThisMonth,
          profitLastMonth,
          margin: profitMargin,
          revenue,
          costs,
          revenueThisMonth,
          costsThisMonth,
        }}
        profitKpi={profitKpi}
        kpis={kpis}
        months={months}
      />

      {/* Right now */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {todayLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "group rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
              item.highlight
                ? "border-warning/40 bg-warning/5 hover:border-warning/60"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <item.icon className={cn("size-4", item.tone)} />
            </div>
            <p className="font-display mt-2 text-3xl font-bold">{item.value}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Open list <ArrowRight className="size-3" />
            </p>
          </Link>
        ))}
      </div>

      {/* Pipeline breakdown */}
      {pipelineTotal > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Where every open repair currently sits.
          </p>
          <div className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
            {STATUS_PIPELINE.map((status) => {
              const count = countByStatus[status] ?? 0;
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  className={cn(
                    "h-full transition-all duration-500 hover:brightness-110",
                    STATUS_META[status].dotClassName,
                  )}
                  style={{ width: `${(count / pipelineTotal) * 100}%` }}
                  title={`${doneLabel(status)}: ${count}`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {STATUS_PIPELINE.map((status) => {
              const count = countByStatus[status] ?? 0;
              if (count === 0) return null;
              return (
                <span
                  key={status}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      STATUS_META[status].dotClassName,
                    )}
                  />
                  {doneLabel(status)} · {count}
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
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
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
