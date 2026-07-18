import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Users, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin overview",
};

const ACTIVE_STATUSES = [
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
] as const;

export default async function AdminOverviewPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [activeCount, readyCount, completedThisMonth, customerCount, recentTickets, statusCounts] =
    await Promise.all([
      prisma.repairTicket.count({
        where: { status: { in: [...ACTIVE_STATUSES] } },
      }),
      prisma.repairTicket.count({
        where: { status: { in: ["COMPLETED", "READY_FOR_PICKUP"] } },
      }),
      prisma.repairTicket.count({
        where: { completedAt: { gte: monthStart } },
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
    ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count]),
  );
  const pipelineTotal = STATUS_PIPELINE.reduce(
    (sum, s) => sum + (countByStatus[s] ?? 0),
    0,
  );

  const stats = [
    { label: "Active repairs", value: activeCount, icon: Wrench, className: "text-primary" },
    { label: "Awaiting pickup", value: readyCount, icon: Clock, className: "text-warning" },
    { label: "Completed this month", value: completedThisMonth, icon: CheckCircle2, className: "text-success" },
    { label: "Customers", value: customerCount, icon: Users, className: "text-info" },
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
          <h2 className="font-display text-lg font-semibold">Recent tickets</h2>
          <Link
            href="/admin/tickets"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            All tickets <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Ticket</TableHead>
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
                    No tickets yet — they&apos;ll appear here as customers submit
                    repair requests.
                  </TableCell>
                </TableRow>
              ) : (
                recentTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="relative">
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="after:absolute after:inset-0"
                      >
                        {ticket.ticketNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{ticket.customer.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {ticket.brand} {ticket.model}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
