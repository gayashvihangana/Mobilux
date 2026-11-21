"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn, formatLKR } from "@/lib/utils";
import type { ChartBucket } from "./reports-chart";

type Metric = "revenue" | "profit" | "finished";

const H = 260;
const PAD = { top: 28, right: 16, bottom: 30, left: 48 };

function niceStep(range: number) {
  const raw = range / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  for (const s of [1, 2, 2.5, 5, 10]) if (raw <= s * mag) return s * mag;
  return 10 * mag;
}

function compact(n: number, money: boolean) {
  if (!money) return String(Math.round(n));
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

// The trend as a line with a soft fill under it. Point anywhere over the
// chart: a guide line snaps to the nearest period and a card shows all three
// figures for it. The highest point and the latest one carry their value.
// Arrow keys move the guide when the chart has keyboard focus.
export function LineChart({
  buckets,
  metric,
  money,
  unit,
}: {
  buckets: ChartBucket[];
  metric: Metric;
  money: boolean;
  unit: "day" | "week" | "month";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = buckets.map((b) => b[metric]);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const step = niceStep(hi - lo || 1);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.max(step, Math.ceil(hi / step) * step);
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax + step / 2; t += step) ticks.push(t);

  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = buckets.length;
  const x = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${y(Math.max(0, yMin)).toFixed(1)} L${x(0).toFixed(1)},${y(Math.max(0, yMin)).toFixed(1)} Z`;

  const peak = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
  const last = n - 1;
  const labelled = [...new Set([peak, last])].filter((i) => values[i] > 0);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 64))));

  const pick = (clientX: number) => {
    const rect = wrap.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    const i = n === 1 ? 0 : Math.round(((px - PAD.left) / plotW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  };

  const a = active !== null ? buckets[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(x(active) - 96, 4), width - 196) : 0;

  return (
    <div
      ref={wrap}
      className="relative mt-3 touch-pan-y select-none"
      onPointerMove={(e) => pick(e.clientX)}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerLeave={() => setActive(null)}
    >
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Line chart by ${unit}. Use Show as table for every figure.`}
        tabIndex={0}
        onFocus={() => setActive((v) => v ?? last)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((v) => Math.max(0, (v ?? last) - 1));
          if (e.key === "ArrowRight") setActive((v) => Math.min(last, (v ?? last) + 1));
        }}
        className="block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid and axis values */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeDasharray={t === 0 ? undefined : "3 4"}
            />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
              {compact(t, money)}
            </text>
          </g>
        ))}

        {/* Period labels */}
        {buckets.map((b, i) =>
          i % labelEvery === last % labelEvery ? (
            <text key={b.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
              {b.short}
            </text>
          ) : null,
        )}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Peak and latest values */}
        {labelled.map((i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(values[i])} r="4.5" fill="var(--primary)" stroke="var(--card)" strokeWidth="2" />
            <text x={x(i)} y={y(values[i]) - 11} textAnchor={i === last && n > 1 ? "end" : "middle"} fontSize="11.5" fontWeight="700" fill="var(--foreground)">
              {compact(values[i], money)}
            </text>
          </g>
        ))}

        {/* Guide line on hover */}
        {active !== null ? (
          <g>
            <line x1={x(active)} x2={x(active)} y1={PAD.top - 8} y2={PAD.top + plotH} stroke="var(--foreground)" strokeOpacity="0.25" />
            <circle cx={x(active)} cy={y(values[active])} r="6" fill="var(--primary)" stroke="var(--card)" strokeWidth="2.5" />
          </g>
        ) : null}
      </svg>

      {a ? (
        <div
          role="status"
          className="pointer-events-none absolute top-0 w-48 rounded-2xl bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-border"
          style={{ left: tipLeft, transform: "translateY(-0.5rem)" }}
        >
          <p className="text-xs font-bold text-muted-foreground">{a.long}</p>
          <dl className="mt-1.5 space-y-1 text-sm">
            {(
              [
                ["Money in", formatLKR(a.revenue), "revenue"],
                ["Profit", formatLKR(a.profit), "profit"],
                ["Finished", String(a.finished), "finished"],
              ] as const
            ).map(([label, value, key]) => (
              <div key={key} className="flex items-baseline justify-between gap-3">
                <dd className={cn("tabular-nums", key === metric ? "font-extrabold" : "font-semibold")}>{value}</dd>
                <dt className="text-xs text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
