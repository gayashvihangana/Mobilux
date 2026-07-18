import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEVICE_TYPES } from "@/lib/status";
import { formatLKR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reports",
};

// ── Data shaping ─────────────────────────────────────────────────────

type MonthBucket = {
  key: string;
  label: string;
  revenue: number;
  costs: number;
  profit: number;
  completed: number;
};

function compactLKR(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `LKR ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `LKR ${Math.round(value / 1_000)}k`;
  return `LKR ${Math.round(value)}`;
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

// ── Chart pieces (server-rendered SVG / HTML) ────────────────────────

const CHART = {
  width: 720,
  height: 220,
  padLeft: 52,
  padRight: 8,
  padTop: 16,
  padBottom: 26,
};

// Bar with only the data-end (top) rounded, flat at the baseline.
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

function MonthlyBarChart({
  months,
  value,
  barClassName,
  tooltip,
  title,
}: {
  months: MonthBucket[];
  value: (m: MonthBucket) => number;
  barClassName: string;
  tooltip: (m: MonthBucket) => string;
  title: string;
}) {
  const { width, height, padLeft, padRight, padTop, padBottom } = CHART;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const max = niceMax(Math.max(...months.map((m) => Math.max(0, value(m)))));
  const slot = plotW / months.length;
  const barW = Math.min(36, slot * 0.55);

  const maxIndex = months.reduce(
    (best, m, i) => (value(m) > value(months[best]) ? i : best),
    0,
  );

  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={title}
    >
      {/* Recessive grid + axis labels */}
      {gridLines.map((f) => {
        const y = padTop + plotH * (1 - f);
        return (
          <g key={f}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {compactLKR(max * f)}
            </text>
          </g>
        );
      })}
      <line
        x1={padLeft}
        x2={width - padRight}
        y1={padTop + plotH}
        y2={padTop + plotH}
        className="stroke-border"
        strokeWidth={1}
      />

      {months.map((m, i) => {
        const v = Math.max(0, value(m));
        const h = max > 0 ? (v / max) * plotH : 0;
        const x = padLeft + slot * i + (slot - barW) / 2;
        const y = padTop + plotH - h;
        const isLatest = i === months.length - 1;
        const highlight = v > 0 && (i === maxIndex || isLatest);
        return (
          <g key={m.key}>
            {v > 0 ? (
              <path d={barPath(x, y, barW, h)} className={barClassName}>
                <title>{tooltip(m)}</title>
              </path>
            ) : (
              // Zero months keep a faint stub so the axis stays readable.
              <rect
                x={x}
                y={padTop + plotH - 2}
                width={barW}
                height={2}
                className="fill-border"
              >
                <title>{tooltip(m)}</title>
              </rect>
            )}
            {/* Selective direct labels: peak + latest only */}
            {highlight ? (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-foreground"
                fontSize={10.5}
                fontWeight={600}
              >
                {compactLKR(v)}
              </text>
            ) : null}
            <text
              x={padLeft + slot * i + slot / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RankedBars({
  items,
  unit,
}: {
  items: { label: string; count: number }[];
  unit: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Not enough data yet.
      </p>
    );
  }
  const max = Math.max(...items.map((i) => i.count));
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm">{item.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.count} {unit}
              {item.count === 1 ? "" : "s"} ·{" "}
              {Math.round((item.count / total) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function AdminReportsPage() {
  const [tickets, paidByTicket] = await Promise.all([
    prisma.repairTicket.findMany({
      select: {
        id: true,
        status: true,
        paidAmount: true,
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

  const paidPaymentByTicket = new Map(
    paidByTicket.map((p) => [p.ticketId as string, Number(p._sum.amount ?? 0)]),
  );
  const revenueOf = (t: (typeof tickets)[number]) => {
    const paymentSum = paidPaymentByTicket.get(t.id) ?? 0;
    return paymentSum > 0 ? paymentSum : t.paidAmount ? Number(t.paidAmount) : 0;
  };

  // Last 12 calendar months, oldest first.
  const now = new Date();
  const monthFormat = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "Asia/Colombo",
  });
  const months: MonthBucket[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: monthFormat.format(d),
      revenue: 0,
      costs: 0,
      profit: 0,
      completed: 0,
    };
  });
  const bucketByKey = new Map(months.map((m) => [m.key, m]));

  for (const t of tickets) {
    const when = t.completedAt ?? t.createdAt;
    const bucket = bucketByKey.get(`${when.getFullYear()}-${when.getMonth()}`);
    if (!bucket) continue;
    bucket.revenue += revenueOf(t);
    bucket.costs += t.partsCost ? Number(t.partsCost) : 0;
    if (t.completedAt) bucket.completed += 1;
  }
  for (const m of months) m.profit = m.revenue - m.costs;

  const trailingRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const trailingProfit = months.reduce((s, m) => s + m.profit, 0);

  // Common issues (case-insensitive grouping, keep first-seen casing).
  const issueCounts = new Map<string, { label: string; count: number }>();
  for (const t of tickets) {
    const key = t.issueTitle.trim().toLowerCase();
    if (!key) continue;
    const entry = issueCounts.get(key);
    if (entry) entry.count += 1;
    else issueCounts.set(key, { label: t.issueTitle.trim(), count: 1 });
  }
  const topIssues = [...issueCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const deviceLabel = Object.fromEntries(
    DEVICE_TYPES.map((d) => [d.value, d.label]),
  );
  const deviceCounts = new Map<string, number>();
  const brandCounts = new Map<string, { label: string; count: number }>();
  for (const t of tickets) {
    deviceCounts.set(t.deviceType, (deviceCounts.get(t.deviceType) ?? 0) + 1);
    const brand = t.brand?.trim();
    if (brand) {
      const key = brand.toLowerCase();
      const entry = brandCounts.get(key);
      if (entry) entry.count += 1;
      else brandCounts.set(key, { label: brand, count: 1 });
    }
  }
  const devices = [...deviceCounts.entries()]
    .map(([type, count]) => ({ label: deviceLabel[type] ?? type, count }))
    .sort((a, b) => b.count - a.count);
  const topBrands = [...brandCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const monthTooltip = (m: MonthBucket) =>
    `${m.label}: ${formatLKR(m.revenue)} revenue · ${formatLKR(m.costs)} costs · ${formatLKR(m.profit)} profit · ${m.completed} completed`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Reports
        </h1>
        <p className="mt-1 text-muted-foreground">
          Revenue trends and repair patterns over the last 12 months —{" "}
          {formatLKR(trailingRevenue)} revenue, {formatLKR(trailingProfit)}{" "}
          profit.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Revenue by month</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          What customers paid for repairs, by month completed.
        </p>
        <MonthlyBarChart
          months={months}
          value={(m) => m.revenue}
          barClassName="fill-primary"
          tooltip={monthTooltip}
          title="Monthly repair revenue for the last 12 months"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Profit by month</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Revenue minus parts costs. Hover a bar for the full breakdown.
        </p>
        <MonthlyBarChart
          months={months}
          value={(m) => m.profit}
          barClassName="fill-success"
          tooltip={monthTooltip}
          title="Monthly repair profit for the last 12 months"
        />
      </section>

      {/* Screen-reader / no-SVG fallback for the monthly figures */}
      <table className="sr-only">
        <caption>Monthly revenue, costs and profit — last 12 months</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue</th>
            <th>Costs</th>
            <th>Profit</th>
            <th>Repairs completed</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.key}>
              <td>{m.label}</td>
              <td>{formatLKR(m.revenue)}</td>
              <td>{formatLKR(m.costs)}</td>
              <td>{formatLKR(m.profit)}</td>
              <td>{m.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Common issues</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          The problems customers bring in most, across all repairs.
        </p>
        <RankedBars items={topIssues} unit="repair" />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Device types</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            What comes across the bench.
          </p>
          <RankedBars items={devices} unit="repair" />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Top brands</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Most-repaired brands overall.
          </p>
          <RankedBars items={topBrands} unit="repair" />
        </section>
      </div>
    </div>
  );
}
