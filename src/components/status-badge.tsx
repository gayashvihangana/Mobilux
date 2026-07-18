import type { TicketStatus } from "@prisma/client";
import { CheckCircle2, XCircle } from "lucide-react";
import { STATUS_META } from "@/lib/status";
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
}: {
  status: TicketStatus;
  className?: string;
}) {
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
      ) : (
        <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      )}
      {meta.label}
    </span>
  );
}
