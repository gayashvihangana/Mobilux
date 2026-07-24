import type { Metadata } from "next";
import {
  CircleUserRound,
  LogIn,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CountUp } from "@/components/count-up";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CustomerDialog, DeleteCustomerButton } from "./customer-forms";

export const metadata: Metadata = {
  title: "Customers",
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONLINE_MS = 15 * 60 * 1000; // treated as "online now"

function relativeTime(date: Date | null): string {
  if (!date) return "Never";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      lastLoginAt: true,
      createdAt: true,
      tickets: { select: { status: true } },
    },
  });

  const now = Date.now();
  const rows = customers.map((c) => {
    const repairs = c.tickets.length;
    const cancellations = c.tickets.filter(
      (t) => t.status === "CANCELLED",
    ).length;
    const lastLoginMs = c.lastLoginAt ? c.lastLoginAt.getTime() : null;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      lastLoginAt: c.lastLoginAt,
      repairs,
      cancellations,
      online: lastLoginMs !== null && now - lastLoginMs < ONLINE_MS,
      activeThisWeek: lastLoginMs !== null && now - lastLoginMs < WEEK_MS,
      hasSignedIn: lastLoginMs !== null,
    };
  });

  const total = rows.length;
  const signedIn = rows.filter((r) => r.hasSignedIn).length;
  const activeThisWeek = rows.filter((r) => r.activeThisWeek).length;
  const totalCancellations = rows.reduce((s, r) => s + r.cancellations, 0);

  const stats = [
    {
      label: "Total customers",
      value: total,
      icon: Users,
      className: "text-primary",
    },
    {
      label: "Active this week",
      value: activeThisWeek,
      icon: Wifi,
      className: "text-success",
      sub: "logged in within 7 days",
    },
    {
      label: "Signed in ever",
      value: signedIn,
      icon: LogIn,
      className: "text-info",
      sub: `${total - signedIn} never logged in`,
    },
    {
      label: "Cancellations",
      value: totalCancellations,
      icon: XCircle,
      className: "text-warning",
      sub: "across all customers",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Customers
          </h1>
          <p className="mt-1 text-muted-foreground">
            Everyone with a shop account — who&apos;s active, their repairs, and
            cancellations.
          </p>
        </div>
        <CustomerDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("size-4", stat.className)} />
            </div>
            <p className="font-display mt-2 text-3xl font-bold">
              <CountUp value={stat.value} />
            </p>
            {stat.sub ? (
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Customer list */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Repairs</TableHead>
              <TableHead className="text-center">Cancellations</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No customers yet — create one with the New customer button.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted/50 text-muted-foreground">
                        <CircleUserRound className="size-5" />
                        {row.online ? (
                          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card bg-success" />
                        ) : null}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {row.repairs}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.cancellations > 0 ? (
                      <span className="font-medium text-warning">
                        {row.cancellations}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm",
                        row.online
                          ? "text-success"
                          : row.activeThisWeek
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {row.online ? (
                        <span className="size-1.5 rounded-full bg-success" />
                      ) : null}
                      {row.online ? "Online now" : relativeTime(row.lastLoginAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <CustomerDialog
                        customer={{
                          id: row.id,
                          name: row.name,
                          email: row.email,
                          phone: row.phone,
                        }}
                      />
                      <DeleteCustomerButton
                        customer={{
                          id: row.id,
                          name: row.name,
                          email: row.email,
                          phone: row.phone,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
