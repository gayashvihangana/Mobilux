import type { StatusUpdate, TicketStatus } from "@prisma/client";
import { Check, TriangleAlert, X } from "lucide-react";
import type { IssueSummary } from "@/lib/repair-issue";
import {
  currentActivityLabel,
  doneLabel,
  milestoneDescription,
  pendingLabel,
  pickupNote,
  STATUS_META,
  type MilestoneContext,
} from "@/lib/status";
import { cn, formatDateTime } from "@/lib/utils";

// Every milestone, in order — used by the vertical timeline to list the
// steps still to come. Submitted/Confirmed belong here: the timeline tells
// the whole story, including the online request and its acceptance.
const TIMELINE_PIPELINE: TicketStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
];

// The horizontal bar shows only the hands-on repair, starting where the
// device physically arrives — Submitted/Confirmed are pre-arrival paperwork
// and would just eat width. While a ticket still sits at either of them the
// first circle is the blue "happening now" node ("Waiting to receive"), so
// nothing is lost.
//
// The final READY_FOR_PICKUP node is purely visual — it's no longer a
// milestone the admin marks (COMPLETED goes straight to PICKED_UP). It's the
// blue "Ready for pickup" circle while the device waits at the shop after the
// Completed node ticks green, then ticks green itself as "Picked up" once
// collected. One collection circle, not two.
const STEPPER_PIPELINE: TicketStatus[] = [
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
];

// The dated rows the issues contribute to the vertical timeline, ready to be
// merged with the real status updates by date. (A declined issue adds no
// "resolved" row of its own — the CANCELLED status update tells that part.)
type IssueEvent = {
  key: string;
  variant: "reported" | "accepted";
  at: Date;
  issue: IssueSummary;
};

function issueEvents(issues?: IssueSummary[] | null): IssueEvent[] {
  if (!issues?.length) return [];
  const events: IssueEvent[] = [];
  for (const issue of issues) {
    events.push({
      key: `issue-${issue.id}-reported`,
      variant: "reported",
      at: issue.reportedAt,
      issue,
    });
    if (issue.status === "ACCEPTED" && issue.resolvedAt) {
      events.push({
        key: `issue-${issue.id}-accepted`,
        variant: "accepted",
        at: issue.resolvedAt,
        issue,
      });
    }
  }
  return events;
}

// One issue row in the vertical timeline — amber for the report itself,
// green once the free fix was agreed.
function IssueRow({
  variant,
  at,
  issue,
  withLine,
}: {
  variant: "reported" | "accepted";
  at: Date;
  issue: IssueSummary;
  withLine: boolean;
}) {
  const reported = variant === "reported";
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {withLine ? (
        <span
          className="absolute top-5 left-[7px] h-full w-0.5 bg-border"
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          "relative mt-1 grid size-4 shrink-0 place-items-center rounded-full",
          reported ? "bg-warning/20 text-warning" : "bg-success/20 text-success",
        )}
      >
        {reported ? (
          <TriangleAlert className="size-3" />
        ) : (
          <Check className="size-3" />
        )}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={cn(
              "text-sm font-semibold",
              reported ? "text-warning" : "text-success",
            )}
          >
            {reported ? "Issue reported" : "Free fix agreed"}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateTime(at)}</p>
        </div>
        {reported ? (
          <>
            <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted-foreground">
              {issue.note}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {issue.solution
                ? `Proposed fix (free of charge): ${issue.solution}`
                : "No fix was possible — a cancellation with a refund was offered."}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">
            The fix goes ahead free of charge — the repair continues.
          </p>
        )}
      </div>
    </li>
  );
}

// Horizontal pipeline stepper (customer-facing "where is my device").
//
// The blue circle is always the step happening RIGHT NOW — labelled with the
// current activity ("Waiting to start the repair", "Repair in progress"). The
// step is not ticked green until that work is actually finished, at which
// point its label switches to the completed name. Everything ahead is a
// greyed-out upcoming step.
export function StatusStepper({
  status,
  cancelledFrom,
  issuePending = false,
}: {
  status: TicketStatus;
  /** For cancelled tickets: the last real milestone reached before the
   * cancellation (derived from the timeline), so the stepper can still show
   * how far the repair got. The steps that never happened are crossed out. */
  cancelledFrom?: TicketStatus | null;
  /** An issue is awaiting the customer's decision — the current node turns
   * amber with an alert to show the pipeline is paused right there. */
  issuePending?: boolean;
}) {
  const cancelled = status === "CANCELLED";
  const lastIndex = STEPPER_PIPELINE.length - 1;

  // doneUpTo = index of the last green (finished) node; activeIndex = the
  // blue "happening now" node. `status` is the last completed milestone, so
  // the active node is normally the one after it. Collection is special: the
  // final node stays blue ("awaiting pickup") until the device is collected.
  let doneUpTo: number;
  let activeIndex: number;
  if (cancelled) {
    doneUpTo = cancelledFrom ? STEPPER_PIPELINE.indexOf(cancelledFrom) : -1;
    activeIndex = -1;
  } else if (status === "PICKED_UP") {
    doneUpTo = lastIndex;
    activeIndex = -1;
  } else if (status === "READY_FOR_PICKUP") {
    doneUpTo = lastIndex - 1;
    activeIndex = lastIndex;
  } else {
    const ci = STEPPER_PIPELINE.indexOf(status);
    doneUpTo = ci;
    activeIndex = ci < lastIndex ? ci + 1 : -1;
  }

  // Color of the connector segment joining index and index+1.
  const segmentClass = (index: number) => {
    if (index + 1 <= doneUpTo) return "bg-success";
    if (index + 1 === activeIndex) return issuePending ? "bg-warning" : "bg-primary";
    return cancelled ? "bg-destructive/25" : "bg-border";
  };

  return (
    <div className={cancelled ? "space-y-3" : undefined}>
      {cancelled ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This repair was cancelled — the crossed-out steps never happened.
          Contact us if this looks wrong.
        </div>
      ) : null}
      <ol className="flex items-start">
        {STEPPER_PIPELINE.map((step, index) => {
          const done = index <= doneUpTo;
          const current = index === activeIndex;
          // Finished steps read as the completed milestone; the last node
          // reads "Picked up" once collected. The blue node reads the live
          // activity. Upcoming steps keep their neutral ongoing name.
          const label = done
            ? index === lastIndex && status === "PICKED_UP"
              ? doneLabel("PICKED_UP")
              : doneLabel(step)
            : current
              ? issuePending
                ? "Issue — decision needed"
                : currentActivityLabel(status)
              : STATUS_META[step].label;
          return (
            <li key={step} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    index === 0 ? "bg-transparent" : segmentClass(index - 1),
                  )}
                />
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold",
                    done && "border-success bg-success text-white",
                    current &&
                      (issuePending
                        ? "border-warning bg-warning/15 text-warning shadow-[0_0_12px] shadow-warning/40"
                        : "border-primary bg-primary/15 text-primary shadow-[0_0_12px] shadow-primary/40"),
                    !done &&
                      !current &&
                      (cancelled
                        ? "border-destructive/40 bg-destructive/5 text-destructive/70"
                        : "border-border bg-card text-muted-foreground"),
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : current && issuePending ? (
                    <TriangleAlert className="size-3.5" />
                  ) : cancelled ? (
                    <X className="size-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    index === lastIndex ? "bg-transparent" : segmentClass(index),
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 hidden px-1 text-center text-[11px] leading-tight md:block",
                  current
                    ? issuePending
                      ? "font-semibold text-warning"
                      : "font-semibold text-primary"
                    : done
                      ? "font-medium text-success"
                      : cancelled
                        ? "text-muted-foreground/70 line-through"
                        : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// The "happening now" row — the current activity, shown in blue with a
// pulsing dot. Reads the fuller current-activity line (e.g. "Diagnosing your
// device"). Turns into a real dated entry once the shop completes that step.
// Once the repair is done, the row flips to "Ready for you to collect" and
// tells the customer where and when to pick the device up (via `ctx`).
export function PendingRow({
  status,
  ctx,
  issuePending = false,
}: {
  status: TicketStatus;
  ctx?: MilestoneContext;
  /** The pipeline is paused on a reported issue — the row turns amber. */
  issuePending?: boolean;
}) {
  const label = pendingLabel(status);
  if (!label) return null;
  const awaitingPickup = status === "COMPLETED" || status === "READY_FOR_PICKUP";
  if (issuePending) {
    return (
      <li className="relative flex gap-4 pb-6">
        <span
          className="absolute top-5 left-[7px] h-full w-0.5 bg-border"
          aria-hidden
        />
        <span className="relative mt-1 grid size-4 shrink-0 place-items-center">
          <span className="absolute inline-flex size-4 animate-ping rounded-full bg-warning/40" />
          <span className="relative size-3 rounded-full border-2 border-warning bg-background" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-warning">
              Paused — issue reported
            </p>
            <span className="rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              Decision needed
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Work is on hold until the reported issue is decided.
          </p>
        </div>
      </li>
    );
  }
  return (
    <li className="relative flex gap-4 pb-6">
      <span
        className="absolute top-5 left-[7px] h-full w-0.5 bg-border"
        aria-hidden
      />
      <span className="relative mt-1 grid size-4 shrink-0 place-items-center">
        <span className="absolute inline-flex size-4 animate-ping rounded-full bg-primary/40" />
        <span className="relative size-3 rounded-full border-2 border-primary bg-background" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-primary">{label}</p>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {awaitingPickup ? "Ready" : "In progress"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {awaitingPickup
            ? pickupNote(ctx)
            : "We'll update this as soon as it's done."}
        </p>
      </div>
    </li>
  );
}

// A step that hasn't happened yet — shown faint with a hollow dot and a
// "Waiting" tag, so the customer can see the whole road ahead.
function UpcomingRow({ status }: { status: TicketStatus }) {
  return (
    <li className="relative flex gap-4 pb-6">
      <span
        className="absolute top-5 left-[7px] h-full w-0.5 bg-border"
        aria-hidden
      />
      <span className="relative mt-1 size-4 shrink-0 rounded-full border-2 border-dashed border-muted-foreground/40 bg-background" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {STATUS_META[status].label}
          </p>
          <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Waiting
          </span>
        </div>
      </div>
    </li>
  );
}

// Vertical history for the customer. Top to bottom: the steps still to come
// (faint "Waiting" rows), the step happening now (blue), then every finished
// step newest-first. `status` is the ticket's current status; `ctx` lets the
// pickup note name the device and the shop's collection details.
export function StatusHistory({
  updates,
  status,
  ctx,
  issues,
}: {
  updates: StatusUpdate[];
  status?: TicketStatus;
  ctx?: MilestoneContext;
  issues?: IssueSummary[] | null;
}) {
  // Steps after the one happening now — shown furthest-away first (top).
  let upcoming: TicketStatus[] = [];
  if (status) {
    const ci = TIMELINE_PIPELINE.indexOf(status);
    if (ci !== -1) {
      // status = last completed milestone → the active step is ci+1, so the
      // still-to-come steps start at ci+2. Reverse so the finish line is up top.
      upcoming = TIMELINE_PIPELINE.slice(ci + 2).reverse();
    }
  }

  // The dated part of the timeline: real status updates plus the issues'
  // own rows, woven together newest-first.
  const rows = [
    ...updates.map((u) => ({
      key: u.id,
      at: u.createdAt,
      kind: "update" as const,
      update: u,
    })),
    ...issueEvents(issues).map((e) => ({
      key: e.key,
      at: e.at,
      kind: "issue" as const,
      variant: e.variant,
      issue: e.issue,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const issuePending = !!issues?.some((i) => i.status === "PENDING");

  return (
    <ol className="space-y-0">
      {upcoming.map((step) => (
        <UpcomingRow key={`upcoming-${step}`} status={step} />
      ))}
      {status ? (
        <PendingRow status={status} ctx={ctx} issuePending={issuePending} />
      ) : null}
      {rows.map((row, index) => {
        const withLine = index < rows.length - 1;
        if (row.kind === "issue") {
          return (
            <IssueRow
              key={row.key}
              variant={row.variant}
              at={row.at}
              issue={row.issue}
              withLine={withLine}
            />
          );
        }
        const update = row.update;
        const meta = STATUS_META[update.status];
        const latest = index === 0;
        return (
          <li key={row.key} className="relative flex gap-4 pb-6 last:pb-0">
            {withLine ? (
              <span
                className="absolute top-5 left-[7px] h-full w-0.5 bg-border"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative mt-1 size-4 shrink-0 rounded-full border-2 border-background",
                meta.dotClassName,
                latest && "shadow-[0_0_10px]",
              )}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={cn("text-sm font-semibold", latest && "text-foreground")}>
                  {doneLabel(update.status)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(update.createdAt)}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {update.note ?? milestoneDescription(update.status, ctx)}
              </p>
              {update.photo ? (
                <a
                  href={update.photo}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block w-fit overflow-hidden rounded-xl border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={update.photo}
                    alt="Handover photo"
                    className="h-32 w-auto object-cover transition-transform hover:scale-105"
                  />
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Re-exported for the admin's editable timeline, which merges the same
// issue rows between its editable status entries.
export { issueEvents, IssueRow };
