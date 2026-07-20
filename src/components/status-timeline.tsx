import type { StatusUpdate, TicketStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { STATUS_META, STATUS_PIPELINE } from "@/lib/status";
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
  // The status just reached is a completed checkpoint — ticked like the
  // ones before it. The node right after it is what's up next, shown as
  // the active blue step. Once the final status is reached there's no
  // "next" left, so everything is simply ticked.
  const nextIndex = currentIndex < lastIndex ? currentIndex + 1 : -1;

  // Color of the connector segment joining index and index+1.
  const segmentClass = (index: number) => {
    if (index + 1 <= currentIndex) return "bg-success";
    if (index + 1 === nextIndex) return "bg-primary";
    return "bg-border";
  };

  return (
    <ol className="flex items-start">
      {STATUS_PIPELINE.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === nextIndex;
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
              {STATUS_META[step].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Vertical history of actual status updates with notes
export function StatusHistory({ updates }: { updates: StatusUpdate[] }) {
  return (
    <ol className="space-y-0">
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
                  {meta.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(update.createdAt)}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {update.note ?? meta.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
