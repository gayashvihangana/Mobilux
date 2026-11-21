import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DEVICE_TYPES } from "@/lib/status";
import { cn, formatLKR } from "@/lib/utils";
import { requirePermission } from "@/lib/auth-guard";
import { ReportsChart, type ChartBucket } from "./reports-chart";

export const metadata: Metadata = {
  title: "Reports",
};

// Reports, in the new look: pick a period at the top and everything below
// (the headline profit, the tiles, the chart and the top lists) shows that
// period, compared with the one before it. The chart can switch between
// money in, profit and repairs finished, and every list row opens the
// matching repairs.

const RANGES = {
  "30d": { label: "30 days", unit: "day", count: 30 },
  "3m": { label: "3 months", unit: "week", count: 13 },
  "6m": { label: "6 months", unit: "month", count: 6 },
  "12m": { label: "12 months", unit: "month", count: 12 },
} as const;
type RangeKey = keyof typeof RANGES;

// ── Colombo calendar days ───────────────────────────────────────────
// Each day is a Date at noon UTC, so adding days or months never slips a
// day, and toISOString().slice(0, 10) is its YYYY-MM-DD key.

function colomboDay(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), 12));
}
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" });
const fmtDay = fmt({ day: "numeric", month: "short" });
const fmtMonth = fmt({ month: "short" });
const fmtMonthYear = fmt({ month: "long", year: "numeric" });

/** Bucket start days for the range (oldest first), and the previous period's start. */
function periods(range: RangeKey, today: Date) {
  const { unit, count } = RANGES[range];
  const starts: Date[] = [];
  let prevStart: Date;
  if (unit === "day") {
    for (let i = count - 1; i >= 0; i--) starts.push(addDays(today, -i));
    prevStart = addDays(starts[0], -count);
  } else if (unit === "week") {
    // Weeks start on Monday.
    const monday = addDays(today, -((today.getUTCDay() + 6) % 7));
    for (let i = count - 1; i >= 0; i--) starts.push(addDays(monday, -7 * i));
    prevStart = addDays(starts[0], -7 * count);
  } else {
    const first = addMonths(today, 0);
    for (let i = count - 1; i >= 0; i--) starts.push(addMonths(first, -i));
    prevStart = addMonths(starts[0], -count);
  }
  return { starts, prevStart };
}

function bucketLabels(range: RangeKey, start: Date, next: Date | null) {
  const { unit } = RANGES[range];
  if (unit === "day") return { short: String(start.getUTCDate()), long: fmtDay.format(start) };
  if (unit === "week") {
    const end = addDays(next ?? addDays(start, 7), -1);
    return { short: fmtDay.format(start), long: `${fmtDay.format(start)} – ${fmtDay.format(end)}` };
  }
  return { short: fmtMonth.format(start), long: fmtMonthYear.format(start) };
}

type Totals = { revenue: number; costs: number; finished: number; paidJobs: number; turnaroundDays: number[] };
const emptyTotals = (): Totals => ({ revenue: 0, costs: 0, finished: 0, paidJobs: 0, turnaroundDays: [] });

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePermission("report:read");
  const params = await searchParams;
  const range: RangeKey = params.range && params.range in RANGES ? (params.range as RangeKey) : "6m";

  const [tickets, paidByTicket] = await Promise.all([
    prisma.repairTicket.findMany({
      select: {
        id: true,
        status: true,
        paidAmount: true,
        finalCost: true,
        partsCost: true,
        issueTitle: true,
        deviceType: true,
        brand: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.payment.groupBy({
      by: ["ticketId"],
      where: { status: "PAID", ticketId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const onlinePaid = new Map(
    paidByTicket.map((p) => [p.ticketId as string, Number(p._sum.amount ?? 0)]),
  );
  // What the customer has paid: recorded payments plus verified transfers.
  const paidOf = (t: (typeof tickets)[number]) =>
    (t.paidAmount ? Number(t.paidAmount) : 0) + (onlinePaid.get(t.id) ?? 0);

  // ── Periods ──
  const today = colomboDay(new Date());
  const todayKey = dayKey(today);
  const { starts, prevStart } = periods(range, today);
  const startKeys = starts.map(dayKey);
  const firstKey = startKeys[0];
  const prevKey = dayKey(prevStart);

  const buckets: (ChartBucket & { totals: Totals })[] = starts.map((s, i) => {
    const labels = bucketLabels(range, s, starts[i + 1] ?? null);
    return { key: startKeys[i], ...labels, revenue: 0, profit: 0, finished: 0, totals: emptyTotals() };
  });
  const current = emptyTotals();
  const previous = emptyTotals();
  const inRange: (typeof tickets)[number][] = [];

  const add = (into: Totals, t: (typeof tickets)[number]) => {
    const paid = paidOf(t);
    into.revenue += paid;
    if (paid > 0) into.paidJobs += 1;
    into.costs += t.partsCost ? Number(t.partsCost) : 0;
    if (t.completedAt) {
      into.finished += 1;
      into.turnaroundDays.push((t.completedAt.getTime() - t.createdAt.getTime()) / 86_400_000);
    }
  };

  for (const t of tickets) {
    if (t.status === "CANCELLED") continue;
    // Money and finished work count when the repair was finished.
    const key = dayKey(colomboDay(t.completedAt ?? t.createdAt));
    if (key >= firstKey && key <= todayKey) {
      let idx = startKeys.length - 1;
      while (idx > 0 && startKeys[idx] > key) idx--;
      add(buckets[idx].totals, t);
      add(current, t);
    } else if (key >= prevKey && key < firstKey) {
      add(previous, t);
    }
    // The top lists count what came in during the period.
    const bookedKey = dayKey(colomboDay(t.createdAt));
    if (bookedKey >= firstKey && bookedKey <= todayKey) inRange.push(t);
  }
  for (const b of buckets) {
    b.revenue = Math.round(b.totals.revenue);
    b.profit = Math.round(b.totals.revenue - b.totals.costs);
    b.finished = b.totals.finished;
  }

  const profit = current.revenue - current.costs;
  const prevProfit = previous.revenue - previous.costs;
  const avgBill = current.paidJobs ? current.revenue / current.paidJobs : 0;
  const prevAvgBill = previous.paidJobs ? previous.revenue / previous.paidJobs : 0;
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const turnaround = median(current.turnaroundDays);
  const prevTurnaround = median(previous.turnaroundDays);

  // Owed right now: finished or in-progress repairs with a price not yet paid.
  let owed = 0;
  let owedJobs = 0;
  for (const t of tickets) {
    if (t.status === "CANCELLED" || !t.finalCost) continue;
    const due = Number(t.finalCost) - paidOf(t);
    if (due > 0.5) {
      owed += due;
      owedJobs += 1;
    }
  }

  // ── Top lists (repairs booked in the period) ──
  const tally = (pick: (t: (typeof tickets)[number]) => string | null | undefined) => {
    const map = new Map<string, { label: string; count: number }>();
    for (const t of inRange) {
      const label = pick(t)?.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const entry = map.get(key);
      if (entry) entry.count += 1;
      else map.set(key, { label, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  };
  const deviceLabel = Object.fromEntries(DEVICE_TYPES.map((d) => [d.value, d.label]));
  const topIssues = tally((t) => t.issueTitle).slice(0, 6);
  const topBrands = tally((t) => t.brand).slice(0, 6);
  const devices = tally((t) => deviceLabel[t.deviceType] ?? t.deviceType);

  const rangeLabel = RANGES[range].label.toLowerCase();
  const chartBuckets: ChartBucket[] = buckets.map(({ totals: _t, ...b }) => b);

  return (
    <div className="space-y-4">
      {/* ── Title and period ─────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-muted-foreground">
            The last {rangeLabel}, compared with the {rangeLabel} before.
          </p>
        </div>
        <nav aria-label="Period" className="flex w-full gap-1 rounded-2xl bg-card p-1 sm:w-auto">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <Link
              key={key}
              href={`/admin/reports?range=${key}`}
              scroll={false}
              aria-current={key === range ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center rounded-xl px-2 text-sm font-bold whitespace-nowrap transition-colors sm:flex-none sm:px-4",
                key === range
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {RANGES[key].label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── Headline profit and tiles ────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="flex flex-col justify-between gap-6 rounded-[2rem] bg-ink p-6 text-ink-foreground sm:p-8 lg:row-span-2">
          <div>
            <p className="text-sm font-bold opacity-80">Profit</p>
            <p className="font-display mt-2 text-[clamp(2rem,9vw,3rem)] leading-none font-extrabold tracking-tight whitespace-nowrap tabular-nums lg:text-[clamp(1.75rem,2.5vw,3rem)]">
              {formatLKR(Math.round(profit))}
            </p>
            <div className="mt-3">
              <Change now={profit} before={prevProfit} onInk />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 border-t border-ink-foreground/15 pt-5 text-sm">
            <div>
              <dt className="opacity-75">Money in</dt>
              <dd className="font-display mt-0.5 text-xl font-extrabold tabular-nums">
                {formatLKR(Math.round(current.revenue))}
              </dd>
            </div>
            <div>
              <dt className="opacity-75">Parts cost</dt>
              <dd className="font-display mt-0.5 text-xl font-extrabold tabular-nums">
                {formatLKR(Math.round(current.costs))}
              </dd>
            </div>
          </dl>
        </section>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Tile
            label="Repairs finished"
            value={String(current.finished)}
            change={<Change now={current.finished} before={previous.finished} />}
          />
          <Tile
            label="Average bill"
            value={formatLKR(Math.round(avgBill))}
            change={<Change now={avgBill} before={prevAvgBill} />}
          />
          <Tile
            label="Typical repair time"
            value={turnaround === null ? "—" : days(turnaround)}
            change={
              turnaround !== null && prevTurnaround !== null ? (
                <Change now={turnaround} before={prevTurnaround} lowerIsBetter />
              ) : (
                <span className="text-sm text-muted-foreground">From booked to finished</span>
              )
            }
          />
          <Link
            href="/admin/tickets?view=list"
            className="flex flex-col justify-between gap-3 rounded-[1.75rem] bg-card p-5 transition-colors hover:bg-accent"
          >
            <span className="text-sm font-bold text-muted-foreground">Owed to you now</span>
            <span className="font-display text-2xl leading-none font-extrabold tabular-nums sm:text-3xl">
              {formatLKR(Math.round(owed))}
            </span>
            <span className="text-sm text-muted-foreground">
              {owedJobs === 0 ? "Nothing unpaid" : `On ${owedJobs} repair${owedJobs === 1 ? "" : "s"}`}
            </span>
          </Link>
        </div>
      </div>

      {/* ── Chart ────────────────────────────────────────── */}
      <ReportsChart buckets={chartBuckets} unit={RANGES[range].unit} />

      {/* ── Top lists ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RankedCard title="Common problems" items={topIssues} />
        <RankedCard title="Top brands" items={topBrands} />
        <RankedCard title="Device types" items={devices} linkable={false} />
      </div>
    </div>
  );
}

function days(n: number) {
  if (n < 1) {
    const h = Math.max(1, Math.round(n * 24));
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const d = Math.round(n * 10) / 10;
  return `${d} day${d === 1 ? "" : "s"}`;
}

function Tile({ label, value, change }: { label: string; value: string; change: React.ReactNode }) {
  return (
    <section className="flex flex-col justify-between gap-3 rounded-[1.75rem] bg-card p-5">
      <h2 className="text-sm font-bold text-muted-foreground">{label}</h2>
      <p className="font-display text-2xl leading-none font-extrabold tabular-nums sm:text-3xl">
        {value}
      </p>
      {change}
    </section>
  );
}

/** "▲ 12% vs before", with an arrow and words, never colour alone. */
function Change({
  now,
  before,
  lowerIsBetter,
  onInk,
}: {
  now: number;
  before: number;
  lowerIsBetter?: boolean;
  onInk?: boolean;
}) {
  if (before === 0 && now === 0) {
    return <span className={cn("text-sm", onInk ? "opacity-75" : "text-muted-foreground")}>No change</span>;
  }
  if (before === 0) {
    return <span className={cn("text-sm", onInk ? "opacity-75" : "text-muted-foreground")}>Nothing in the period before</span>;
  }
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  const up = pct > 0;
  const good = pct === 0 ? null : lowerIsBetter ? !up : up;
  const Icon = pct === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        onInk
          ? "bg-ink-foreground/15 text-ink-foreground"
          : good === null
            ? "bg-secondary text-muted-foreground"
            : good
              ? "bg-success/12 text-success"
              : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {pct === 0 ? "Same as before" : `${up ? "Up" : "Down"} ${Math.abs(pct)}% on the period before`}
    </span>
  );
}

function RankedCard({
  title,
  items,
  linkable = true,
}: {
  title: string;
  items: { label: string; count: number }[];
  linkable?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <section className="rounded-[1.75rem] bg-card p-5 sm:p-6">
      <h2 className="font-display mb-3 text-lg font-extrabold">{title}</h2>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No repairs booked in this period.</p>
      ) : (
        <ul className="-mx-2">
          {items.map((item) => {
            const body = (
              <>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-bold">{item.label}</span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {item.count} · {Math.round((item.count / total) * 100)}%
                  </span>
                </span>
                <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </span>
              </>
            );
            return (
              <li key={item.label}>
                {linkable ? (
                  <Link
                    href={`/admin/tickets?view=list&q=${encodeURIComponent(item.label)}`}
                    title={`Show ${item.label} repairs`}
                    className="block rounded-xl px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="px-2 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
