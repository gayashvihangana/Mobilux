"use client";

import { useState } from "react";
import { LineChart as LineIcon, Table2 } from "lucide-react";
import { cn, formatLKR } from "@/lib/utils";
import { LineChart } from "./line-chart";

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
  revenue: { label: "Money in", money: true },
  profit: { label: "Profit", money: true },
  finished: { label: "Repairs finished", money: false },
} as const;
type Metric = keyof typeof METRICS;

// One line chart that switches between money in, profit and repairs
// finished (see LineChart for hover and keyboard). "Show as table" gives the
// same numbers as rows.
export function ReportsChart({
  buckets,
  unit,
}: {
  buckets: ChartBucket[];
  unit: "day" | "week" | "month";
}) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [view, setView] = useState<"chart" | "table">("chart");
  const m = METRICS[metric];

  const values = buckets.map((b) => b[metric]);
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
          {view === "chart" ? <Table2 className="size-4" /> : <LineIcon className="size-4" />}
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
        <LineChart buckets={buckets} metric={metric} money={m.money} unit={unit} />
      )}
    </section>
  );
}
