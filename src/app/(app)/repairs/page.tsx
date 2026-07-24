import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Wrench } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DONE_TICKET_STATUSES } from "@/lib/completed-repairs";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/ticket-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My repairs",
};

// Same "active" set the dashboard card counts, so the deep-links match.
const ACTIVE_STATUSES: TicketStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { filter } = await searchParams;
  const active: FilterKey = FILTERS.some((f) => f.key === filter)
    ? (filter as FilterKey)
    : "all";

  const statusWhere =
    active === "active"
      ? { status: { in: ACTIVE_STATUSES } }
      : active === "completed"
        ? { status: { in: DONE_TICKET_STATUSES } }
        : {};

  const tickets = await prisma.repairTicket.findMany({
    where: { customerId: session.user.id, ...statusWhere },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            My repairs
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every repair you&apos;ve done with Mobilux, past and present.
          </p>
        </div>
        <Button asChild>
          <Link href="/repairs/new">
            <Plus className="size-4" /> New repair
          </Link>
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/repairs" : `/repairs?filter=${f.key}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              active === f.key
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <Wrench className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 font-semibold">
            {active === "all" ? "No repairs yet" : `No ${active} repairs`}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {active === "all"
              ? "When you submit a repair request it will show up here with live status tracking."
              : "Nothing here right now — try a different filter."}
          </p>
          {active === "all" ? (
            <Button asChild className="mt-5">
              <Link href="/repairs/new">
                <Plus className="size-4" /> Start your first repair
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              href={`/repairs/${ticket.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
