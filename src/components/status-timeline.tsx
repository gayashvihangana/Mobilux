import type { TicketStatus } from "@prisma/client";
import { Check, TriangleAlert } from "lucide-react";
import type { IssueSummary } from "@/lib/repair-issue";

// Only what the timeline actually renders — deliberately not Prisma's full
// StatusUpdate. The public tracker queries a narrow column list that has no
// `note` or `photo` at all, and typing it this way means the compiler proves
// those columns never reach a signed-out page rather than trusting a flag.
export type TimelineUpdate = {
  id: string;
  status: TicketStatus;
  createdAt: Date;
  note?: string | null;
  photo?: string | null;
};
import {
  milestoneDescription,
  pickupNote,
  REPAIR_STEPS,
  repairStepIndex,
  STATUS_META,
  statusLabel,
  type MilestoneContext,
} from "@/lib/status";

const TERMINAL: TicketStatus[] = ["PICKED_UP", "CANCELLED"];
import { cn, formatDateTime } from "@/lib/utils";

// Every status a repair passes through, in order — the vertical timeline
// lists the ones still to come above the dated history.
const TIMELINE_PIPELINE: TicketStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "PICKED_UP",
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

// The six steps of a repair as a row of bars, with the step it is on now
// highlighted (the approved "steps" design). `status` is what is happening
// now, so the current bar IS the status; everything before it is done.
// Phones have no room for six names, so they get the current step in words.
export function StatusStepper({
  status,
  cancelledFrom,
  issuePending = false,
}: {
  status: TicketStatus;
  /** For cancelled tickets: the last real step reached before the
   * cancellation (from the timeline), so the bars still show how far the
   * repair got. */
  cancelledFrom?: TicketStatus | null;
  /** An issue is waiting on the customer's decision — the current bar turns
   * amber to show the repair is paused there. */
  issuePending?: boolean;
}) {
  const cancelled = status === "CANCELLED";
  const pickedUp = status === "PICKED_UP";
  const current = cancelled
    ? -1
    : pickedUp
      ? REPAIR_STEPS.length
      : repairStepIndex(status);
  const reached = cancelled
    ? cancelledFrom
      ? repairStepIndex(cancelledFrom)
      : -1
    : current;

  const summary = cancelled
    ? "Cancelled"
    : issuePending
      ? "Paused — waiting for the customer to decide"
      : statusLabel(status);

  return (
    <div className="space-y-3">
      {cancelled ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This repair was cancelled. The crossed-out steps never happened.
        </div>
      ) : null}
      <p className="text-sm font-bold md:hidden">
        {summary}
        {current >= 0 && current < REPAIR_STEPS.length ? (
          <span className="font-medium text-muted-foreground">
            {" "}
            · step {current + 1} of {REPAIR_STEPS.length}
          </span>
        ) : null}
      </p>
      <ol className="grid grid-cols-6 gap-1.5 md:gap-2">
        {REPAIR_STEPS.map((step, index) => {
          const isCurrent = index === current;
          const done = cancelled ? index <= reached : index < current;
          return (
            <li key={step} aria-current={isCurrent ? "step" : undefined}>
              <span
                aria-hidden
                className={cn(
                  "block h-1.5 rounded-full",
                  isCurrent
                    ? issuePending
                      ? "bg-warning"
                      : "bg-primary"
                    : done
                      ? "bg-foreground"
                      : cancelled
                        ? "bg-destructive/20"
                        : "bg-border",
                )}
              />
              <span
                className={cn(
                  "mt-2 hidden text-xs leading-tight md:block",
                  isCurrent
                    ? issuePending
                      ? "font-bold text-warning"
                      : "font-bold text-primary"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground",
                  cancelled && !done && "line-through",
                )}
              >
                {statusLabel(step)}
              </span>
              <span className="sr-only md:hidden">{statusLabel(step)}</span>
              <span className="sr-only">
                {isCurrent ? " (now)" : done ? " (done)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Shown at the top of the timeline while a reported issue waits for the
// customer's decision: the repair is on hold until then. Nothing is shown
// otherwise — the newest dated entry already says what is happening now.
export function PendingRow({ issuePending = false }: { issuePending?: boolean }) {
  if (!issuePending) return null;
  return (
    <li className="relative flex gap-4 pb-6">
      <span
        className="absolute top-5 left-[7px] h-full w-0.5 bg-border"
        aria-hidden
      />
      <span className="relative mt-1 grid size-4 shrink-0 place-items-center">
        <span className="relative size-3 rounded-full border-2 border-warning bg-background" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-warning">
            Paused — issue reported
          </p>
          <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
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

/** Timeline text for an entry with no note. The newest entry of a repair
 * that is ready to collect gets the full "come and collect" message. */
export function entryDescription(
  status: TicketStatus,
  isNow: boolean,
  ctx?: MilestoneContext,
) {
  if (isNow && (status === "COMPLETED" || status === "READY_FOR_PICKUP")) {
    return pickupNote(ctx);
  }
  return milestoneDescription(status, ctx);
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
          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
  publicView = false,
}: {
  updates: TimelineUpdate[];
  status?: TicketStatus;
  ctx?: MilestoneContext;
  issues?: IssueSummary[] | null;
  /**
   * Rendering for the signed-out tracker, where the only credential is a link
   * that may have been forwarded on. Milestones and dates still show — that is
   * the whole point of the page — but the shop's free-text notes and handover
   * photos do not. Admins write those notes for themselves and they routinely
   * carry the customer's passcode, phone number or address; a photo taken at
   * collection can show the customer. The signed-in owner sees everything on
   * /repairs/[id].
   */
  publicView?: boolean;
}) {
  // Steps after the one happening now — shown furthest-away first (top).
  let upcoming: TicketStatus[] = [];
  if (status) {
    const ci = TIMELINE_PIPELINE.indexOf(
      status === "READY_FOR_PICKUP" ? "COMPLETED" : status,
    );
    if (ci !== -1) {
      // `status` is the step happening now, so the ones still to come start
      // right after it. Reversed so the finish line is at the top.
      upcoming = TIMELINE_PIPELINE.slice(ci + 1).reverse();
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
    // Issue rows quote what went wrong verbatim ("we cracked the back glass
    // on this one"). The stepper still signals that a decision is pending, so
    // a signed-out visitor learns the repair needs their attention without
    // the dispute itself being readable from a forwarded link.
    ...(publicView ? [] : issueEvents(issues)).map((e) => ({
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
      <PendingRow issuePending={issuePending} />
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
        const isNow = update.id === updates[0]?.id && update.status === status;
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
                  {statusLabel(update.status)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(update.createdAt)}
                </p>
                {isNow && !TERMINAL.includes(update.status) ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Now
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {publicView
                  ? entryDescription(update.status, isNow, ctx)
                  : (update.note ?? entryDescription(update.status, isNow, ctx))}
              </p>
              {update.photo && !publicView ? (
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
