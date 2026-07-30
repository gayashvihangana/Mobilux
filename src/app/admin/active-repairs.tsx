import Link from "next/link";
import type { DeviceType, TicketStatus } from "@prisma/client";
import {
  ArrowRight,
  Laptop,
  Plus,
  Smartphone,
  Sparkles,
  Tablet,
  TriangleAlert,
  UserRound,
  Watch,
  Wrench,
} from "lucide-react";
import {
  currentActivityLabel,
  doneLabel,
  STATUS_META,
  STATUS_PIPELINE,
  statusRank,
} from "@/lib/status";
import { cn, formatLKR } from "@/lib/utils";

const DEVICE_ICONS: Record<DeviceType, typeof Smartphone> = {
  PHONE: Smartphone,
  TABLET: Tablet,
  LAPTOP: Laptop,
  SMARTWATCH: Watch,
  OTHER: Wrench,
};

// The bench: everything accepted but not yet finished. Ordered oldest-first by
// the page so the repair that has waited longest sits at the front.
export type ActiveRepair = {
  id: string;
  ticketNumber: string;
  deviceType: DeviceType;
  brand: string | null;
  model: string | null;
  issueTitle: string;
  status: TicketStatus;
  customer: string;
  technician: string | null;
  /** Whatever we'll charge — the agreed final price if it's set, else the quote. */
  cost: number | null;
  costIsQuote: boolean;
  createdAt: string;
  updatedAt: string;
  /** Bench errors still awaiting the customer's answer. */
  openIssues: number;
};

const DAY = 86_400_000;
const daysSince = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / DAY);

function dayLabel(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

// How the card is tinted. Waiting on a supplier isn't the shop's fault, so it
// gets its own calm amber; silence for days is what actually needs chasing.
type Accent = "primary" | "warning" | "destructive";

const ACCENT = {
  primary: {
    text: "text-primary",
    border: "border-primary/25",
    hoverBorder: "hover:border-primary/50",
    bg: "bg-primary/10",
    fill: "bg-primary",
    glow: "bg-primary/15",
    shadow: "hover:shadow-primary/10",
  },
  warning: {
    text: "text-warning",
    border: "border-warning/30",
    hoverBorder: "hover:border-warning/60",
    bg: "bg-warning/10",
    fill: "bg-warning",
    glow: "bg-warning/15",
    shadow: "hover:shadow-warning/10",
  },
  destructive: {
    text: "text-destructive",
    border: "border-destructive/35",
    hoverBorder: "hover:border-destructive/60",
    bg: "bg-destructive/10",
    fill: "bg-destructive",
    glow: "bg-destructive/15",
    shadow: "hover:shadow-destructive/10",
  },
} as const;

function accentOf(repair: ActiveRepair, idle: number): Accent {
  if (repair.openIssues > 0 || idle >= 5) return "destructive";
  if (repair.status === "AWAITING_PARTS" || idle >= 3) return "warning";
  return "primary";
}

// The pipeline as a row of segments, filled up to where this repair sits.
function PipelineTrack({
  status,
  accent,
}: {
  status: TicketStatus;
  accent: Accent;
}) {
  const rank = statusRank(status);
  return (
    <div className="flex gap-1" aria-hidden>
      {STATUS_PIPELINE.map((step, i) => (
        <span
          key={step}
          title={doneLabel(step)}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-500",
            i < rank && "bg-muted-foreground/40",
            i === rank && cn(ACCENT[accent].fill, "shadow-sm"),
            i > rank && "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function RepairCard({ repair, index }: { repair: ActiveRepair; index: number }) {
  const Icon = DEVICE_ICONS[repair.deviceType];
  const idle = daysSince(repair.updatedAt);
  const age = daysSince(repair.createdAt);
  const accent = accentOf(repair, idle);
  const tone = ACCENT[accent];
  const device =
    [repair.brand, repair.model].filter(Boolean).join(" ") || "Device";
  const rank = statusRank(repair.status);

  return (
    <Link
      href={`/admin/tickets/${repair.id}`}
      className={cn(
        "group animate-fade-up relative flex flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        tone.border,
        tone.hoverBorder,
        tone.shadow,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className={cn(
          "absolute -top-14 -right-10 size-32 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-90",
          tone.glow,
        )}
        aria-hidden
      />

      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
            tone.border,
            tone.bg,
          )}
        >
          <Icon className={cn("size-5", tone.text)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold transition-colors group-hover:text-primary">
            {device}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {repair.customer} · <span className="font-mono">{repair.ticketNumber}</span>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
            "border-border text-muted-foreground",
          )}
          title={`In the shop ${dayLabel(age)}`}
        >
          day {age + 1}
        </span>
      </div>

      <p className="relative mt-3 truncate text-sm text-muted-foreground">
        {repair.issueTitle}
      </p>

      {/* What's happening right now — the live line the shop reads first. */}
      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            tone.border,
            tone.bg,
            tone.text,
          )}
        >
          <span className="relative grid size-2 place-items-center">
            <span
              className={cn(
                "absolute inline-flex size-2 animate-ping rounded-full opacity-60",
                tone.fill,
              )}
            />
            <span className={cn("relative size-1.5 rounded-full", tone.fill)} />
          </span>
          {currentActivityLabel(repair.status)}
        </span>
        {repair.technician ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
            <UserRound className="size-3" />
            {repair.technician}
          </span>
        ) : null}
        {repair.openIssues > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
            <TriangleAlert className="size-3" />
            {repair.openIssues} open issue{repair.openIssues === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="relative mt-auto pt-4">
        <PipelineTrack status={repair.status} accent={accent} />
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">
            Step {rank + 1} of {STATUS_PIPELINE.length} ·{" "}
            <span className={cn(idle >= 3 && "font-medium text-warning")}>
              {idle <= 0 ? "updated today" : `quiet ${dayLabel(idle)}`}
            </span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums">
            {repair.cost === null ? (
              <span className="font-normal text-muted-foreground">No quote</span>
            ) : (
              <>
                {formatLKR(repair.cost)}
                {repair.costIsQuote ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    est.
                  </span>
                ) : null}
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ActiveRepairsBoard({
  repairs,
  total,
  attention,
  stageCounts,
  pendingCount,
}: {
  /** The slice shown on the board — the rest live behind "View all". */
  repairs: ActiveRepair[];
  total: number;
  /** Across every active repair: gone quiet for days, or has an open issue. */
  attention: number;
  stageCounts: { status: TicketStatus; count: number }[];
  /** Submitted online, not yet confirmed — they aren't on the bench yet. */
  pendingCount: number;
}) {
  return (
    <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="bg-grid absolute inset-0 opacity-30" aria-hidden />
      <div
        className="absolute -top-28 -left-20 size-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10">
              <Wrench className="size-4.5 text-primary" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
                Active repairs
              </h2>
              <p className="text-sm text-muted-foreground">
                {total === 0
                  ? "Nothing on the bench right now."
                  : `${total} device${total === 1 ? "" : "s"} on the bench${
                      attention > 0 ? ` · ${attention} need${attention === 1 ? "s" : ""} a nudge` : ""
                    }`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 ? (
            <Link
              href="/admin/tickets?status=SUBMITTED"
              className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
            >
              <Sparkles className="size-3.5" />
              {pendingCount} to confirm
            </Link>
          ) : null}
          <Link
            href="/admin/tickets/new"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="size-3.5" /> New repair
          </Link>
          <Link
            href="/admin/tickets"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Stage counts — a one-line read of where the bench is bunching up. */}
      {stageCounts.length > 0 ? (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {stageCounts.map(({ status, count }) => (
            <Link
              key={status}
              href={`/admin/tickets?status=${status}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  STATUS_META[status].dotClassName,
                )}
              />
              {doneLabel(status)}
              <span className="font-semibold tabular-nums text-foreground">
                {count}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {repairs.length === 0 ? (
        <div className="relative mt-5 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-10 text-center">
          <Wrench className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No repairs in progress — every device that came in has gone back out.
          </p>
          <Link
            href="/admin/tickets/new"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-3.5" /> Log a walk-in repair
          </Link>
        </div>
      ) : (
        <div className="relative mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {repairs.map((repair, i) => (
            <RepairCard key={repair.id} repair={repair} index={i} />
          ))}

          {total > repairs.length ? (
            <Link
              href="/admin/tickets"
              className="group animate-fade-up grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
              style={{ animationDelay: `${repairs.length * 60}ms` }}
            >
              <div>
                <p className="font-display text-2xl font-bold text-primary">
                  +{total - repairs.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  more on the bench
                </p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View all <ArrowRight className="size-3" />
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
