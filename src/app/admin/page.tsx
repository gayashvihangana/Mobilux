import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth-guard";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { statusLabel, statusRank } from "@/lib/status";
import { cn, formatLKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NextStepButton } from "@/components/admin/next-step-button";
import { PhoneGlyph } from "@/components/admin/phone-glyph";
import { QuickRepairForm } from "./tickets/new/quick-repair-form";

export const metadata: Metadata = {
  title: "Today",
};

const ACTIVE_STATUSES = [
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
] as const;

// Billed, with nothing recorded against it — the same rule the Shop numbers
// page uses, so the two can never disagree about what is owed.
const UNPAID_WHERE = {
  finalCost: { not: null },
  paidAt: null,
  paidAmount: null,
  status: { not: "CANCELLED" },
  payments: { none: { status: "PAID" } },
} as const;

const DAY_MS = 86_400_000;

const rupees = (value: number) => formatLKR(Math.round(value));

function deviceName(t: { brand: string | null; model: string | null }) {
  return [t.brand, t.model].filter(Boolean).join(" ") || "Device";
}

function ownerName(t: {
  customerName: string | null;
  customer: { name: string } | null;
}) {
  return t.customerName ?? t.customer?.name ?? "Walk-in";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** "today", "day 2", "day 5" — counted from when the device came in. */
function dayOf(createdAt: Date, now: Date) {
  const days = Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
  return days <= 0 ? "today" : `day ${days + 1}`;
}

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Colombo",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const user = await requireStaff();
  const showMoney = can(user, "report:read");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [active, ready, readyCount, unpaid, monthTickets, paidByTicket] =
    await Promise.all([
      prisma.repairTicket.findMany({
        where: { status: { in: [...ACTIVE_STATUSES] } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          ticketNumber: true,
          brand: true,
          model: true,
          issueTitle: true,
          status: true,
          estimatedCost: true,
          createdAt: true,
          updatedAt: true,
          customerName: true,
          customer: { select: { name: true } },
        },
      }),
      // Fixed and still on the shelf — longest wait first.
      prisma.repairTicket.findMany({
        where: { status: { in: ["COMPLETED", "READY_FOR_PICKUP"] } },
        orderBy: { completedAt: { sort: "asc", nulls: "last" } },
        take: 4,
        select: {
          id: true,
          brand: true,
          model: true,
          customerName: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.repairTicket.count({
        where: { status: { in: ["COMPLETED", "READY_FOR_PICKUP"] } },
      }),
      prisma.repairTicket.aggregate({
        where: UNPAID_WHERE,
        _count: { _all: true },
        _sum: { finalCost: true },
      }),
      // Money lands in the month a repair finished, or the month it came in
      // while it is still open — the same rule the Reports page charts by, so
      // "this month" here and the last bar there are one number.
      showMoney
        ? prisma.repairTicket.findMany({
            where: {
              OR: [
                { completedAt: { gte: monthStart } },
                { completedAt: null, createdAt: { gte: monthStart } },
              ],
            },
            select: {
              id: true,
              paidAmount: true,
              partsCost: true,
              createdAt: true,
              completedAt: true,
            },
          })
        : Promise.resolve([]),
      showMoney
        ? prisma.payment.groupBy({
            by: ["ticketId"],
            where: { status: "PAID", ticketId: { not: null } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
    ]);

  // The repair furthest along is the one closest to money and a free bench
  // slot, so it leads. Ties go to whichever has been here longest.
  const bench = [...active].sort(
    (a, b) =>
      statusRank(b.status) - statusRank(a.status) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const next = bench[0];
  const others = bench.slice(1, 5);

  // ── This month's money ─────────────────────────────────────────
  const paidPayments = new Map(
    paidByTicket.map((p) => [p.ticketId as string, Number(p._sum.amount ?? 0)]),
  );
  // Days 1–7, 8–14, 15–21, then everything after in the last bar.
  const weeks = [0, 0, 0, 0];
  let revenue = 0;
  let costs = 0;
  let finished = 0;
  for (const t of monthTickets) {
    const online = paidPayments.get(t.id) ?? 0;
    const ticketRevenue = online > 0 ? online : Number(t.paidAmount ?? 0);
    revenue += ticketRevenue;
    costs += Number(t.partsCost ?? 0);
    if (t.completedAt) finished += 1;
    const when = t.completedAt ?? t.createdAt;
    weeks[Math.min(3, Math.floor((when.getDate() - 1) / 7))] += ticketRevenue;
  }
  const profit = revenue - costs;
  const tallestWeek = Math.max(...weeks, 1);
  const currentWeek = Math.min(3, Math.floor((now.getDate() - 1) / 7));

  const monthName = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "Asia/Colombo",
  }).format(now);
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Colombo",
  }).format(now);
  const firstName = user.name?.split(/\s+/)[0];

  const unpaidTotal = Number(unpaid._sum.finalCost ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/tickets/new">
            <Plus /> New repair
          </Link>
        </Button>
      </div>

      {/* ── Row 1: what to do first ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="relative flex min-h-72 flex-col justify-center gap-3 overflow-hidden rounded-[2rem] bg-ink p-6 text-ink-foreground sm:p-8 lg:col-span-2">
          {next ? (
            <>
              <span className="self-start rounded-full bg-ink-foreground px-3 py-1.5 text-xs font-bold text-ink">
                Next on the bench
              </span>
              <h2 className="font-display max-w-[11ch] text-3xl leading-[1.05] font-extrabold tracking-tight sm:max-w-[14ch] sm:text-5xl">
                {deviceName(next)}
              </h2>
              <p className="max-w-[26ch] text-base text-ink-foreground/80 sm:max-w-[34ch]">
                {next.issueTitle} · {ownerName(next)} ·{" "}
                {statusLabel(next.status)}, {dayOf(next.createdAt, now)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <NextStepButton
                  ticketId={next.id}
                  status={next.status}
                  deviceName={deviceName(next)}
                  estimatedCost={
                    next.estimatedCost ? Number(next.estimatedCost) : null
                  }
                  tone="primary"
                  size="lg"
                />
                <Button
                  asChild
                  size="lg"
                  className="bg-ink-foreground/15 text-ink-foreground hover:bg-ink-foreground/25"
                >
                  <Link href={`/admin/tickets/${next.id}`}>
                    Open repair <ArrowRight />
                  </Link>
                </Button>
              </div>
              <PhoneGlyph
                body="fill-ink-foreground"
                screen="fill-primary"
                className="pointer-events-none absolute -right-2 -bottom-16 hidden w-40 rotate-[10deg] sm:block"
              />
            </>
          ) : (
            <>
              <span className="self-start rounded-full bg-ink-foreground px-3 py-1.5 text-xs font-bold text-ink">
                The bench is clear
              </span>
              <h2 className="font-display max-w-[14ch] text-3xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
                No repairs in progress
              </h2>
              <p className="max-w-[34ch] text-base text-ink-foreground/80">
                Book in the next device when it arrives.
              </p>
              <div className="mt-2">
                <Button asChild size="lg">
                  <Link href="/admin/tickets/new">
                    <Plus /> New repair
                  </Link>
                </Button>
              </div>
            </>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <Link
            href="/admin/tickets?status=COMPLETED"
            className="flex flex-1 flex-col justify-between gap-4 rounded-[1.75rem] bg-primary p-5 text-primary-foreground transition-opacity hover:opacity-95"
          >
            <div className="flex items-start justify-between">
              <span className="text-sm font-bold">Ready for pickup</span>
              <span className="font-display text-5xl leading-[0.9] font-extrabold">
                {readyCount}
              </span>
            </div>
            {ready.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex">
                  {ready.map((t, i) => (
                    <span
                      key={t.id}
                      className={cn(
                        "grid size-10 place-items-center rounded-full border-2 border-primary bg-primary-foreground text-xs font-extrabold text-primary",
                        i > 0 && "-ml-2.5",
                      )}
                    >
                      {initials(ownerName(t))}
                    </span>
                  ))}
                </div>
                <span className="min-w-0 truncate text-sm font-semibold">
                  {deviceName(ready[0])}
                  {readyCount > 1 ? ` + ${readyCount - 1} more` : ""}
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-primary-foreground/85">
                Nothing waiting on the shelf.
              </span>
            )}
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/admin/tickets"
              className="flex flex-col gap-1 rounded-[1.75rem] bg-card p-5 transition-colors hover:bg-accent"
            >
              <span className="text-sm font-semibold text-muted-foreground">
                On the bench
              </span>
              <span className="font-display text-4xl leading-none font-extrabold">
                {active.length}
              </span>
            </Link>
            <Link
              href="/admin/tickets?status=unpaid"
              className={cn(
                "flex flex-col gap-1 rounded-[1.75rem] p-5 transition-opacity hover:opacity-90",
                unpaid._count._all > 0
                  ? "bg-warning-soft text-foreground"
                  : "bg-card",
              )}
            >
              <span className="text-sm font-semibold text-muted-foreground">
                Unpaid
              </span>
              <span className="font-display text-xl leading-10 font-extrabold">
                {unpaid._count._all > 0 ? rupees(unpaidTotal) : "None"}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Row 2: add, earn, and what else is open ─────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-[1.75rem] bg-card p-5 sm:p-6">
          <h2 className="font-display mb-3 text-lg font-extrabold">
            Quick new repair
          </h2>
          <QuickRepairForm compact />
        </section>

        {showMoney ? (
          <section className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-extrabold">{monthName}</h2>
              <Link
                href="/admin/reports"
                className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline"
              >
                Reports
              </Link>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold tracking-tight">
                {rupees(profit)}
              </p>
              <p className="text-sm text-muted-foreground">
                profit · {rupees(revenue)} paid, {rupees(costs)} parts ·{" "}
                {finished} finished
              </p>
            </div>
            <div
              role="img"
              aria-label={`Money received by week: ${weeks
                .map((w, i) => `week ${i + 1} ${rupees(w)}`)
                .join(", ")}`}
              className="mt-auto grid h-24 grid-cols-4 items-end gap-2.5"
            >
              {weeks.map((w, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl",
                    i === currentWeek ? "bg-primary" : "bg-primary/25",
                  )}
                  style={{ height: `${Math.max(8, (w / tallestWeek) * 96)}px` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2.5 text-center text-xs text-muted-foreground">
              <span>Wk 1</span>
              <span>Wk 2</span>
              <span>Wk 3</span>
              <span>Wk 4</span>
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-2 rounded-[1.75rem] bg-card p-5 sm:p-6">
          <h2 className="font-display mb-1 text-lg font-extrabold">
            Also on the bench
          </h2>
          {others.length > 0 ? (
            others.map((t) => {
              // Quiet for three days or more: the one to chase.
              const stale = now.getTime() - t.updatedAt.getTime() > 3 * DAY_MS;
              return (
                <Link
                  key={t.id}
                  href={`/admin/tickets/${t.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-2 transition-colors",
                    stale ? "bg-warning-soft hover:bg-warning-tint" : "hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-13 shrink-0 place-items-center rounded-xl",
                      stale ? "bg-warning-tint" : "bg-accent",
                    )}
                  >
                    <PhoneGlyph className="h-9" screen="fill-primary/60" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-extrabold">
                      {deviceName(t)}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-sm",
                        stale
                          ? "font-semibold text-warning"
                          : "text-muted-foreground",
                      )}
                    >
                      {statusLabel(t.status)} · {dayOf(t.createdAt, now)}
                    </span>
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              {next
                ? "Nothing else is open right now."
                : "Repairs you book in will show here."}
            </p>
          )}
          {bench.length > 5 ? (
            <Link
              href="/admin/tickets"
              className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline"
            >
              See all {bench.length} open repairs
            </Link>
          ) : null}
        </section>
      </div>

      {showMoney ? (
        <p className="text-sm text-muted-foreground">
          Looking for success rate, pipeline and yearly totals?{" "}
          <Link
            href="/admin/overview"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Open Shop numbers
          </Link>
        </p>
      ) : null}
    </div>
  );
}
