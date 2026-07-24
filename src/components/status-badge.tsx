import type { TicketStatus } from "@prisma/client";
import { CheckCircle2, XCircle } from "lucide-react";
import { currentActivityLabel, doneLabel, pendingLabel, STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

// Statuses where the work is done — shown with a check so they're
// recognizable at a glance.
const DONE_STATUSES: TicketStatus[] = [
  "COMPLETED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
];

export function StatusBadge({
  status,
  className,
  activity = false,
}: {
  status: TicketStatus;
  className?: string;
  /** Show the live "happening now" activity (e.g. "Waiting for parts")
   * instead of the last completed milestone. Used on detail-page headers so
   * the pill reflects what's currently going on, not what just finished. */
  activity?: boolean;
}) {
  // In activity mode, an in-flight ticket shows its current activity in a
  // live blue pill; terminal steps (Picked Up, Cancelled) fall through to
  // the normal done/cancelled look.
  if (activity && pendingLabel(status)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-primary",
          className,
        )}
      >
        <span className="relative grid size-2 place-items-center">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary/50" />
          <span className="relative size-1.5 rounded-full bg-primary" />
        </span>
        {currentActivityLabel(status)}
      </span>
    );
  }

  const meta = STATUS_META[status];
  const done = DONE_STATUSES.includes(status);
  const cancelled = status === "CANCELLED";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      {done ? (
        <CheckCircle2 className="size-3.5 shrink-0" />
      ) : cancelled ? (
        <XCircle className="size-3.5 shrink-0" />
      ) : null}
      {doneLabel(status)}
    </span>
  );
}
