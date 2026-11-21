"use client";

import { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { cn, formatLKR } from "@/lib/utils";

export type ChartBucket = {
  key: string;
  /** Under the bar, e.g. "Nov" or "12". */
  short: string;
  /** In the tooltip and table, e.g. "November 2026". */
  long: string;
  revenue: number;
  profit: number;
  finished: number;
};

const METRICS = {
  revenue: { label: "Money in", money: true, bar: "bg-primary" },
  profit: { label: "Profit", money: true, bar: "bg-primary" },
  finished: { label: "Repairs finished", money: false, bar: "bg-primary" },
} as const;
type Metric = keyof typeof METRICS;

function compact(n: number, money: boolean) {
  if (!money) return String(n);
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 2, 2.5, 5, 10]) if (v <= step * mag) return step * mag;
  return 10 * mag;
}

// One bar chart that switches between money in, profit and repairs
// finished. Hover or tab onto a bar for all three figures; the peak and the
// latest bar carry their value. "Table" shows the same numbers as rows.
export function ReportsChart({
  buckets,
  unit,
}: {
  buckets: ChartBucket[];
  unit: "day" | "week" | "month";
}) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const m = METRICS[metric];

  const values = buckets.map((b) => b[metric]);
  const max = niceMax(Math.max(0, ...values));
  const peak = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
  const last = buckets.length - 1;
  // Daily bars are too many to label every one.
  const labelEvery = unit === "day" ? 5 : unit === "week" ? 2 : 1;
  const fmt = (n: number) => (m.money ? formatLKR(n) : String(n));
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <section className="rounded-[1.75rem] bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-[1_1_18rem] gap-1 rounded-2xl bg-secondary p-1" role="tablist" aria-label="What the chart shows">
          {(Object.keys(METRICS) as Metric[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={metric === key}
              onClick={() => setMetric(key)}
              className={cn(
                "min-h-10 flex-1 rounded-xl px-3 text-sm font-bold whitespace-nowrap transition-colors",
                metric === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {METRICS[key].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-primary hover:bg-accent"
        >
          {view === "chart" ? <Table2 className="size-4" /> : <BarChart3 className="size-4" />}
          {view === "chart" ? "Show as table" : "Show as chart"}
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {m.label} by {unit}, {fmt(total)} in all
      </p>

      {total === 0 && view === "chart" ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nothing in this period yet.
        </p>
      ) : view === "table" ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-bold capitalize">{unit}</th>
                <th className="py-2 text-right font-bold">Money in</th>
                <th className="py-2 text-right font-bold">Profit</th>
                <th className="py-2 text-right font-bold">Finished</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-semibold">{b.long}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatLKR(b.revenue)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatLKR(b.profit)}</td>
                  <td className="py-2.5 text-right tabular-nums">{b.finished}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3 pl-10">
          {/* Grid lines and axis values */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-6 bottom-7">
            {[1, 0.5, 0].map((f) => (
              <div
                key={f}
                className="absolute inset-x-0 flex items-center gap-2"
                style={{ top: `${(1 - f) * 100}%` }}
              >
                <span className="w-8 -translate-y-1/2 text-right text-[11px] text-muted-foreground tabular-nums">
                  {compact(max * f, m.money)}
                </span>
                <span className="h-px flex-1 -translate-y-1/2 bg-border" />
              </div>
            ))}
          </div>

          <ul
            className="relative flex h-64 items-stretch gap-[2px] sm:gap-1"
            aria-label={`${m.label} by ${unit}`}
            onPointerLeave={() => setActive(null)}
          >
            {buckets.map((b, i) => {
              const v = b[metric];
              const h = Math.max(0, v) / max;
              const labelled = v > 0 && (i === peak || i === last);
              const isActive = active === i;
              return (
                <li key={b.key} className="relative flex min-w-0 flex-1 flex-col">
                  <button
                    type="button"
                    aria-label={`${b.long}: ${formatLKR(b.revenue)} money in, ${formatLKR(b.profit)} profit, ${b.finished} finished`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(isActive ? null : i)}
                    className="group flex flex-1 flex-col justify-end rounded-lg pt-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="relative flex h-full flex-col justify-end">
                      {labelled ? (
                        <span
                          className="absolute inset-x-[-1rem] text-center text-[11px] font-bold tabular-nums"
                          style={{ bottom: `calc(${h * 100}% + 4px)` }}
                        >
                          {compact(v, m.money)}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "mx-auto block w-full max-w-10 rounded-t-[4px] transition-opacity",
                          v > 0 ? m.bar : "bg-border",
                          i === last || isActive ? "opacity-100" : "opacity-70",
                          active !== null && !isActive && "opacity-40",
                        )}
                        style={{ height: v > 0 ? `${h * 100}%` : "2px" }}
                      />
                    </span>
                  </button>
                  <span aria-hidden="true" className="relative mt-2 h-5">
                    <span
                      className={cn(
                        "absolute left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground",
                        i % labelEvery !== last % labelEvery && "invisible",
                      )}
                    >
                      {b.short}
                    </span>
                  </span>

                  {/* Tooltip: values first, labels after */}
                  {isActive ? (
                    <div
                      role="status"
                      className={cn(
                        "pointer-events-none absolute z-10 w-48 rounded-2xl bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-border",
                        i < buckets.length / 3 ? "left-0" : i > (buckets.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                      )}
                      style={{ bottom: `calc(1.75rem + (100% - 3.25rem) * ${h} + 8px)` }}
                    >
                      <p className="text-xs font-bold text-muted-foreground">{b.long}</p>
                      <dl className="mt-1.5 space-y-1 text-sm">
                        {(
                          [
                            ["Money in", formatLKR(b.revenue), "revenue"],
                            ["Profit", formatLKR(b.profit), "profit"],
                            ["Finished", String(b.finished), "finished"],
                          ] as const
                        ).map(([label, value, key]) => (
                          <div key={key} className="flex items-baseline justify-between gap-3">
                            <dd className={cn("tabular-nums", key === metric ? "font-extrabold" : "font-semibold")}>
                              {value}
                            </dd>
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
