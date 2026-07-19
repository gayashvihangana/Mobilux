import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { LinkedTableRow } from "@/components/linked-table-row";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_META } from "@/lib/status";
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
  { value: "SUBMITTED", label: "Needs confirmation" },
  { value: "RECEIVED", label: "Received" },
  { value: "DIAGNOSING", label: "Diagnosing" },
  { value: "AWAITING_PARTS", label: "Awaiting parts" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "READY_FOR_PICKUP", label: "Ready" },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter =
    status && status !== "all" && status in STATUS_META
      ? (status as TicketStatus)
      : undefined;

  const tickets = await prisma.repairTicket.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Repairs
          </h1>
          <p className="mt-1 text-muted-foreground">
            {tickets.length} repair{tickets.length === 1 ? "" : "s"}
            {filter ? ` · ${STATUS_META[filter].label}` : ""}
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
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/admin/tickets" : `/admin/tickets?status=${f.value}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary/40 bg-primary/15 font-medium text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {f.label}
            </Link>
          );
        })}
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
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="text-right">Bill</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No repairs match this filter.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const paid = ticket.paidAmount ? Number(ticket.paidAmount) : null;
                const parts = ticket.partsCost ? Number(ticket.partsCost) : null;
                const profit =
                  paid !== null || parts !== null
                    ? (paid ?? 0) - (parts ?? 0)
                    : null;
                return (
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
                      <p className="font-medium">
                        {ticket.customer?.name ?? ticket.customerName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.customer?.email ?? "no account"}
                      </p>
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
                    <TableCell
                      className={cn(
                        "text-right text-xs font-medium whitespace-nowrap",
                        profit !== null && profit > 0 && "text-success",
                        profit !== null && profit < 0 && "text-destructive",
                        profit === null && "text-muted-foreground",
                      )}
                    >
                      {profit !== null ? formatLKR(profit) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(ticket.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {ticket.finalCost || ticket.paidAmount ? (
                        <Link
                          href={`/bill/${ticket.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Receipt className="size-3.5" /> Bill
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </LinkedTableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
