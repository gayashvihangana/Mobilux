import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Clock, Receipt, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDateTime, formatLKR } from "@/lib/utils";
import { RejectPaymentDialog, VerifyPaymentForm } from "./payment-review";

export const metadata: Metadata = {
  title: "Payments",
};

export default async function AdminPaymentsPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [pending, reviewed, collectedMonth, collectedTotal] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING_VERIFICATION" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, email: true } },
        ticket: { select: { id: true, ticketNumber: true, brand: true, model: true } },
      },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PAID", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true } },
        ticket: { select: { id: true, ticketNumber: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", verifiedAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  const stats = [
    {
      label: "Awaiting verification",
      value: String(pending.length),
      icon: Clock,
      className: "text-warning",
    },
    {
      label: "Collected this month",
      value: formatLKR(Number(collectedMonth._sum.amount ?? 0)),
      icon: TrendingUp,
      className: "text-success",
    },
    {
      label: "Collected all-time",
      value: formatLKR(Number(collectedTotal._sum.amount ?? 0)),
      icon: Banknote,
      className: "text-primary",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Payments
        </h1>
        <p className="mt-1 text-muted-foreground">
          Verify bank-transfer receipts and track collections.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("size-4", stat.className)} />
            </div>
            <p className="font-display mt-2 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Verification queue */}
      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">
          Verification queue
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-success/25 bg-success/10">
              <Receipt className="size-5 text-success" />
            </span>
            <h3 className="mt-4 font-semibold">All caught up</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              No receipts waiting for verification right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-warning/30 bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {payment.user.name}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {payment.ticket?.ticketNumber}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.ticket
                        ? `${[payment.ticket.brand, payment.ticket.model].filter(Boolean).join(" ") || "Device"} · `
                        : ""}
                      Submitted {formatDateTime(payment.createdAt)}
                    </p>
                    {payment.reference ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ref: <span className="font-mono">{payment.reference}</span>
                      </p>
                    ) : null}
                  </div>
                  <p className="font-display text-xl font-bold">
                    {formatLKR(payment.amount.toString())}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {payment.receiptUrl ? (
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-primary transition-colors hover:bg-accent"
                    >
                      <Receipt className="size-4" /> View receipt
                    </a>
                  ) : null}
                  {payment.ticket ? (
                    <Link
                      href={`/admin/tickets/${payment.ticket.id}`}
                      className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      Open ticket
                    </Link>
                  ) : null}
                  <div className="ml-auto flex gap-2">
                    <RejectPaymentDialog paymentId={payment.id} />
                    <VerifyPaymentForm paymentId={payment.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">Recent history</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Ticket</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Reviewed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No reviewed payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                reviewed.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {payment.ticket ? (
                        <Link
                          href={`/admin/tickets/${payment.ticket.id}`}
                          className="hover:text-primary"
                        >
                          {payment.ticket.ticketNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{payment.user.name}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatLKR(payment.amount.toString())}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                          payment.status === "PAID"
                            ? "border-success/30 bg-success/15 text-success"
                            : "border-destructive/30 bg-destructive/15 text-destructive",
                        )}
                      >
                        {payment.status === "PAID" ? "Paid" : "Rejected"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(payment.updatedAt)}
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
