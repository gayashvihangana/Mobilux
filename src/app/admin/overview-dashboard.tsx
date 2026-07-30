"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  Inbox,
  Percent,
  Smartphone,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/count-up";
import { cn, formatLKR } from "@/lib/utils";

// ── Shapes handed over from the server page ──────────────────────────

export type MonthPoint = {
  key: string;
  label: string;
  revenue: number;
  costs: number;
  profit: number;
  completed: number;
  created: number;
  customers: number;
  errors: number;
};

export type MonthField = Exclude<keyof MonthPoint, "key" | "label">;

export type ValueFormat = "lkr" | "int" | "percent";

export type Kpi = {
  id: string;
  label: string;
  /** Pre-formatted headline value — the server owns the formatting rules. */
  value: string;
  raw: number;
  sub: string;
  icon: IconName;
  tone: Tone;
  detail: {
    description: string;
    /** Which monthly series to chart in the dialog. */
    field: MonthField;
    seriesLabel: string;
    format: ValueFormat;
    stats: { label: string; value: string }[];
    breakdown?: { label: string; value: number; hint?: string }[];
    breakdownFormat?: ValueFormat;
    link?: { href: string; label: string };
  };
};

type Tone = "success" | "warning" | "primary" | "info" | "destructive";

const TONE = {
  success: {
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    fill: "bg-success",
    hover: "hover:border-success/40 hover:shadow-success/10",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    fill: "bg-warning",
    hover: "hover:border-warning/40 hover:shadow-warning/10",
  },
  primary: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    fill: "bg-primary",
    hover: "hover:border-primary/40 hover:shadow-primary/10",
  },
  info: {
    text: "text-info",
    bg: "bg-info/10",
    border: "border-info/30",
    fill: "bg-info",
    hover: "hover:border-info/40 hover:shadow-info/10",
  },
  destructive: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    fill: "bg-destructive",
    hover: "hover:border-destructive/40 hover:shadow-destructive/10",
  },
} as const;

// Icons can't cross the server/client boundary, so cards name one instead.
const ICONS = {
  banknote: Banknote,
  wallet: Wallet,
  trendingUp: TrendingUp,
  percent: Percent,
  smartphone: Smartphone,
  target: Target,
  wrench: Wrench,
  triangleAlert: TriangleAlert,
  inbox: Inbox,
  clock: Clock,
  users: Users,
  checkCircle: CheckCircle2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

function formatValue(value: number, format: ValueFormat) {
  if (format === "lkr") return formatLKR(value);
  if (format === "percent") return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString("en-LK");
}

// ── Charts ───────────────────────────────────────────────────────────

// Monthly columns. Negative months (a loss) drop below the baseline so a bad
// month is unmistakable rather than just short.
function MonthColumns({
  months,
  field,
  format,
  tone,
}: {
  months: MonthPoint[];
  field: MonthField;
  format: ValueFormat;
  tone: Tone;
}) {
  const values = months.map((m) => m[field]);
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const hasNegative = values.some((v) => v < 0);

  return (
    <div>
      <div className="flex items-stretch gap-1 sm:gap-1.5">
        {months.map((m, i) => {
          const v = m[field];
          const height = (Math.abs(v) / max) * 100;
          return (
            <div
              key={m.key}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              {/* Positive half */}
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-7 origin-bottom rounded-t-md transition-all duration-500 ease-out",
                    v > 0 ? TONE[tone].fill : "bg-border",
                    "group-hover:brightness-110",
                  )}
                  style={{
                    height: v > 0 ? `${Math.max(height, 2)}%` : "2px",
                    animationDelay: `${i * 40}ms`,
                  }}
                  title={`${m.label}: ${formatValue(v, format)}`}
                />
              </div>
              {/* Negative half, only drawn when some month is negative */}
              {hasNegative ? (
                <div className="flex h-8 w-full items-start justify-center">
                  {v < 0 ? (
                    <div
                      className="w-full max-w-7 rounded-b-md bg-destructive transition-all duration-500 ease-out group-hover:brightness-110"
                      style={{ height: `${Math.max(height * 0.33, 2)}%` }}
                      title={`${m.label}: ${formatValue(v, format)}`}
                    />
                  ) : null}
                </div>
              ) : null}
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {m.label}
              </span>
              <span className="h-3 text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                {formatValue(v, format)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Smooth area + line for the profit hero. Server data, client render — the
// path is pure maths, no library needed.
function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  const width = 320;
  const height = 72;
  if (values.length < 2) return null;

  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const y = (v: number) => height - ((v - min) / span) * height;

  const points = values.map((v, i) => [i * stepX, y(v)] as const);
  // Catmull-Rom-ish smoothing: pull each segment toward its neighbours.
  const line = points
    .map(([px, py], i) => {
      if (i === 0) return `M ${px} ${py}`;
      const [prevX, prevY] = points[i - 1];
      const cx = (prevX + px) / 2;
      return `C ${cx} ${prevY} ${cx} ${py} ${px} ${py}`;
    })
    .join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="profit-fade" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            className={TONE[tone].text}
            stopColor="currentColor"
            stopOpacity="0.35"
          />
          <stop
            offset="100%"
            className={TONE[tone].text}
            stopColor="currentColor"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#profit-fade)" />
      <path
        d={line}
        fill="none"
        className={TONE[tone].text}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function BreakdownBars({
  items,
  format,
  tone,
}: {
  items: { label: string; value: number; hint?: string }[];
  format: ValueFormat;
  tone: Tone;
}) {
  if (items.length === 0) return null;
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm">{item.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatValue(item.value, format)}
              {item.hint ? ` · ${item.hint}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                TONE[tone].fill,
              )}
              style={{ width: `${(Math.abs(item.value) / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Detail dialog ────────────────────────────────────────────────────

function KpiDialog({
  kpi,
  months,
  open,
  onOpenChange,
}: {
  kpi: Kpi | null;
  months: MonthPoint[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!kpi) return null;
  const tone = TONE[kpi.tone];
  const Icon = ICONS[kpi.icon];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl border",
                tone.bg,
                tone.border,
              )}
            >
              <Icon className={cn("size-4.5", tone.text)} />
            </span>
            {kpi.label}
          </DialogTitle>
          <DialogDescription>{kpi.detail.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p
              className={cn(
                "font-display text-4xl font-bold tracking-tight",
                tone.text,
              )}
            >
              {kpi.value}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {kpi.detail.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-0.5 font-semibold tabular-nums">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="mb-4 text-sm font-medium">
              {kpi.detail.seriesLabel}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                last 12 months
              </span>
            </p>
            <MonthColumns
              months={months}
              field={kpi.detail.field}
              format={kpi.detail.format}
              tone={kpi.tone}
            />
          </div>

          {kpi.detail.breakdown && kpi.detail.breakdown.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <p className="mb-3 text-sm font-medium">Breakdown</p>
              <BreakdownBars
                items={kpi.detail.breakdown}
                format={kpi.detail.breakdownFormat ?? kpi.detail.format}
                tone={kpi.tone}
              />
            </div>
          ) : null}

          {kpi.detail.link ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={kpi.detail.link.href}>
                {kpi.detail.link.label} <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Profit hero ──────────────────────────────────────────────────────

export type ProfitHeroData = {
  profit: number;
  profitThisMonth: number;
  profitLastMonth: number;
  margin: number;
  revenue: number;
  costs: number;
  revenueThisMonth: number;
  costsThisMonth: number;
};

// ── The dashboard ────────────────────────────────────────────────────

export function OverviewDashboard({
  hero,
  profitKpi,
  kpis,
  months,
}: {
  hero: ProfitHeroData;
  /** The KPI opened by clicking the profit hero. */
  profitKpi: Kpi;
  kpis: Kpi[];
  months: MonthPoint[];
}) {
  const [active, setActive] = useState<Kpi | null>(null);
  const positive = hero.profit >= 0;
  const tone: Tone = positive ? "success" : "destructive";
  // Month-on-month movement, the number a shop owner actually reacts to.
  const delta = hero.profitThisMonth - hero.profitLastMonth;
  const deltaPct =
    hero.profitLastMonth !== 0
      ? (delta / Math.abs(hero.profitLastMonth)) * 100
      : null;

  return (
    <>
      {/* ── Profit, front and centre ──────────────────────────── */}
      <section
        onClick={() => setActive(profitKpi)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActive(profitKpi);
          }
        }}
        aria-label="Net profit — open details"
        className={cn(
          "group animate-fade-up relative cursor-pointer overflow-hidden rounded-3xl border bg-card p-6 text-left transition-all duration-300 sm:p-8",
          "hover:-translate-y-0.5 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          TONE[tone].border,
          TONE[tone].hover,
        )}
      >
        <div
          className={cn(
            "absolute -top-24 -right-16 size-72 rounded-full blur-3xl transition-opacity duration-500",
            positive ? "bg-success/15" : "bg-destructive/15",
            "group-hover:opacity-80",
          )}
          aria-hidden
        />
        <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-lg border",
                  TONE[tone].bg,
                  TONE[tone].border,
                )}
              >
                {positive ? (
                  <TrendingUp className={cn("size-4", TONE[tone].text)} />
                ) : (
                  <TrendingDown className={cn("size-4", TONE[tone].text)} />
                )}
              </span>
              <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                Net profit
              </p>
            </div>

            <p
              className={cn(
                "font-display mt-3 text-4xl leading-none font-bold tracking-tight sm:text-5xl",
                TONE[tone].text,
              )}
            >
              <CountUp value={hero.profit} format="lkr" />
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                  TONE[tone].bg,
                  TONE[tone].border,
                  TONE[tone].text,
                )}
              >
                <Percent className="size-3" />
                {hero.margin.toFixed(1)}% margin
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium",
                  delta >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {delta >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {formatLKR(Math.abs(delta))}
                {deltaPct !== null ? ` (${Math.abs(deltaPct).toFixed(0)}%)` : ""}{" "}
                vs last month
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Revenue",
                  value: hero.revenue,
                  sub: hero.revenueThisMonth,
                  cls: "text-success",
                },
                {
                  label: "Costs",
                  value: hero.costs,
                  sub: hero.costsThisMonth,
                  cls: "text-warning",
                },
                {
                  label: "This month",
                  value: hero.profitThisMonth,
                  sub: null,
                  cls: hero.profitThisMonth >= 0 ? "text-success" : "text-destructive",
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p
                    className={cn(
                      "font-display mt-0.5 text-lg font-bold tabular-nums",
                      item.cls,
                    )}
                  >
                    {formatLKR(item.value)}
                  </p>
                  {item.sub !== null ? (
                    <p className="text-[11px] text-muted-foreground">
                      {formatLKR(item.sub)} this month
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Sparkline values={months.map((m) => m.profit)} tone={tone} />
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{months[0]?.label}</span>
              <span>{months[months.length - 1]?.label}</span>
            </div>
            <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              Open profit details <ArrowUpRight className="size-3.5" />
            </p>
          </div>
        </div>
      </section>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => {
          const tone = TONE[kpi.tone];
          const Icon = ICONS[kpi.icon];
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setActive(kpi)}
              className={cn(
                "group animate-fade-up rounded-2xl border border-border bg-card p-5 text-left transition-all duration-300",
                "hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                tone.hover,
              )}
              style={{ animationDelay: `${60 + i * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-lg border transition-transform duration-300 group-hover:scale-110",
                    tone.bg,
                    tone.border,
                  )}
                >
                  <Icon className={cn("size-4", tone.text)} />
                </span>
              </div>
              <p
                className={cn(
                  "font-display mt-2 text-2xl font-bold tracking-tight",
                  tone.text,
                )}
              >
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Details & trend <ArrowUpRight className="size-3" />
              </p>
            </button>
          );
        })}
      </div>

      <KpiDialog
        kpi={active}
        months={months}
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      />
    </>
  );
}
