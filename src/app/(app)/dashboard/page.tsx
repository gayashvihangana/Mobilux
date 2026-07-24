import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgePercent, CheckCircle2, Plus, Wrench } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DONE_TICKET_STATUSES } from "@/lib/completed-repairs";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/ticket-card";

export const metadata: Metadata = {
  title: "Dashboard",
};

const ACTIVE_STATUSES = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
] as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, allTickets, discountRules, liveCompleted] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, completedRepairs: true },
    }),
    prisma.repairTicket.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.discountRule.findMany({
      where: { active: true },
      orderBy: { minRepairs: "asc" },
    }),
    prisma.repairTicket.count({
      where: {
        customerId: session.user.id,
        status: { in: DONE_TICKET_STATUSES },
      },
    }),
  ]);
  if (!user) redirect("/login");

  const activeStatusSet = new Set<string>(ACTIVE_STATUSES);
  const activeCount = allTickets.filter((t) =>
    activeStatusSet.has(t.status),
  ).length;

  // Heal counters that drifted before syncCompletedRepairs existed —
  // the loyalty discount at payment time reads the stored counter.
  if (liveCompleted !== user.completedRepairs) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { completedRepairs: liveCompleted },
    });
  }

  const completed = liveCompleted;
  const currentRule = [...discountRules]
    .reverse()
    .find((r) => completed >= r.minRepairs);
  const nextRule = discountRules.find((r) => completed < r.minRepairs);
  const loyaltyProgress = nextRule
    ? Math.min(completed / nextRule.minRepairs, 1)
    : 1;

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Hey {firstName} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            {activeCount > 0
              ? `You have ${activeCount} repair${activeCount > 1 ? "s" : ""} in progress.`
              : "All quiet — no repairs in progress right now."}
          </p>
        </div>
        <Button asChild>
          <Link href="/repairs/new">
            <Plus className="size-4" /> New repair
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/repairs?filter=active"
          className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active repairs</p>
            <Wrench className="size-4 text-primary" />
          </div>
          <p className="font-display mt-2 text-3xl font-bold">{activeCount}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View active <ArrowRight className="size-3" />
          </p>
        </Link>
        <Link
          href="/repairs?filter=completed"
          className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-success/40 hover:bg-accent/40"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Completed repairs</p>
            <CheckCircle2 className="size-4 text-success" />
          </div>
          <p className="font-display mt-2 text-3xl font-bold">{completed}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-success opacity-0 transition-opacity group-hover:opacity-100">
            View completed <ArrowRight className="size-3" />
          </p>
        </Link>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Loyalty reward</p>
            <BadgePercent className="size-4 text-primary" />
          </div>
          <p className="font-display mt-2 text-3xl font-bold text-primary">
            {currentRule ? `${Number(currentRule.discountPercent)}% off` : "0% off"}
          </p>
          {nextRule ? (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(loyaltyProgress * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {nextRule.minRepairs - completed} more repair
                {nextRule.minRepairs - completed > 1 ? "s" : ""} to unlock{" "}
                {Number(nextRule.discountPercent)}% off
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {discountRules.length > 0
                ? "You've unlocked our top reward — thank you!"
                : "Rewards program coming soon."}
            </p>
          )}
        </div>
      </div>

      {/* All repairs — most recent first */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your repairs</h2>
          <Link
            href="/repairs"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {allTickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
              <Wrench className="size-5 text-primary" />
            </span>
            <h3 className="mt-4 font-semibold">No repairs yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Something broken? Submit a repair request and track it live from
              here.
            </p>
            <Button asChild className="mt-5">
              <Link href="/repairs/new">
                <Plus className="size-4" /> Start a repair
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {allTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                href={`/repairs/${ticket.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
