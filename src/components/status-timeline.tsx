import type { StatusUpdate, TicketStatus } from "@prisma/client";
import { Check } from "lucide-react";
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

// The stepper's visual pipeline. The final READY_FOR_PICKUP node is purely
// visual — it's no longer a milestone the admin marks (COMPLETED goes
// straight to PICKED_UP). It's the blue "Ready for pickup" circle while the
// device waits at the shop after the Completed node ticks green, then ticks
// green itself as "Picked up" once collected. One collection circle, not two.
const STEPPER_PIPELINE: TicketStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
];

// Horizontal pipeline stepper (customer-facing "where is my device").
//
// The blue circle is always the step happening RIGHT NOW — labelled with the
// current activity ("Waiting to start the repair", "Repair in progress"). The
// step is not ticked green until that work is actually finished, at which
// point its label switches to the completed name. Everything ahead is a
// greyed-out upcoming step.
export function StatusStepper({ status }: { status: TicketStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        This ticket was cancelled. Contact us if this looks wrong.
      </div>
    );
  }

  const lastIndex = STEPPER_PIPELINE.length - 1;

  // doneUpTo = index of the last green (finished) node; activeIndex = the
  // blue "happening now" node. `status` is the last completed milestone, so
  // the active node is normally the one after it. Collection is special: the
  // final node stays blue ("awaiting pickup") until the device is collected.
  let doneUpTo: number;
  let activeIndex: number;
  if (status === "PICKED_UP") {
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
    if (index + 1 === activeIndex) return "bg-primary";
    return "bg-border";
  };

  return (
    <ol className="flex items-start">
      {STEPPER_PIPELINE.map((step, index) => {
        const done = index <= doneUpTo;
        const current = index === activeIndex;
        // Finished steps read as the completed milestone; the last node reads
        // "Picked up" once collected. The blue node reads the live activity.
        // Upcoming steps keep their neutral ongoing name.
        const label = done
          ? index === lastIndex && status === "PICKED_UP"
            ? doneLabel("PICKED_UP")
            : doneLabel(step)
          : current
            ? currentActivityLabel(status)
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
                    "border-primary bg-primary/15 text-primary shadow-[0_0_12px] shadow-primary/40",
                  !done && !current && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
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
                  ? "font-semibold text-primary"
                  : done
                    ? "font-medium text-success"
                    : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
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
}: {
  status: TicketStatus;
  ctx?: MilestoneContext;
}) {
  const label = pendingLabel(status);
  if (!label) return null;
  const awaitingPickup = status === "COMPLETED" || status === "READY_FOR_PICKUP";
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
}: {
  updates: StatusUpdate[];
  status?: TicketStatus;
  ctx?: MilestoneContext;
}) {
  // Steps after the one happening now — shown furthest-away first (top).
  let upcoming: TicketStatus[] = [];
  if (status) {
    const ci = STEPPER_PIPELINE.indexOf(status);
    if (ci !== -1) {
      // status = last completed milestone → the active step is ci+1, so the
      // still-to-come steps start at ci+2. Reverse so the finish line is up top.
      upcoming = STEPPER_PIPELINE.slice(ci + 2).reverse();
    }
  }

  return (
    <ol className="space-y-0">
      {upcoming.map((step) => (
        <UpcomingRow key={`upcoming-${step}`} status={step} />
      ))}
      {status ? <PendingRow status={status} ctx={ctx} /> : null}
      {updates.map((update, index) => {
        const meta = STATUS_META[update.status];
        const latest = index === 0;
        return (
          <li key={update.id} className="relative flex gap-4 pb-6 last:pb-0">
            {index < updates.length - 1 ? (
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
