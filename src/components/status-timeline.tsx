import type { StatusUpdate, TicketStatus } from "@prisma/client";
import { Check } from "lucide-react";
import {
  doneLabel,
  milestoneDescription,
  pendingLabel,
  STATUS_META,
  STATUS_PIPELINE,
} from "@/lib/status";
import { cn, formatDateTime } from "@/lib/utils";

// Horizontal pipeline stepper (customer-facing "where is my device")
export function StatusStepper({ status }: { status: TicketStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        This ticket was cancelled. Contact us if this looks wrong.
      </div>
    );
  }

  const currentIndex = STATUS_PIPELINE.indexOf(status);
  const lastIndex = STATUS_PIPELINE.length - 1;

  // status = last COMPLETED milestone, so every node up to and including
  // it is done (ticked), and the very next node is what's being worked
  // toward now (the active blue node, shown with its ongoing name). Once
  // the final milestone is reached there's no active node left.
  const activeIndex = currentIndex < lastIndex ? currentIndex + 1 : -1;
  const isDone = (index: number) => index <= currentIndex;

  // Color of the connector segment joining index and index+1.
  const segmentClass = (index: number) => {
    if (isDone(index + 1)) return "bg-success";
    if (index + 1 === activeIndex) return "bg-primary";
    return "bg-border";
  };

  return (
    <ol className="flex items-start">
      {STATUS_PIPELINE.map((step, index) => {
        const done = isDone(index);
        const current = index === activeIndex;
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
              {/* Ticked steps are behind us — "Diagnosed", not
                  "Diagnosing". Current/pending steps haven't happened
                  yet, so they keep the ongoing/activity name. */}
              {done ? doneLabel(step) : STATUS_META[step].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The note-less "what's next" row shown at the very top of the timeline
// while a ticket is still in progress. Derived from the current status —
// it has no note and no timestamp, and turns into a real entry once the
// shop completes that step.
export function PendingRow({ status }: { status: TicketStatus }) {
  const label = pendingLabel(status);
  if (!label) return null;
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
            In progress
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          We&apos;ll update this as soon as it&apos;s done.
        </p>
      </div>
    </li>
  );
}

// Vertical history for the customer. Each finished step is an entry with
// its completed (milestone) name + note; the current step rides on top as
// the note-less pending row. `status` is the ticket's current status.
export function StatusHistory({
  updates,
  status,
}: {
  updates: StatusUpdate[];
  status?: TicketStatus;
}) {
  return (
    <ol className="space-y-0">
      {status ? <PendingRow status={status} /> : null}
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
                {update.note ?? milestoneDescription(update.status)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
