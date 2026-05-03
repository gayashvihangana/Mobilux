import type { RepairStatus } from "@/lib/types";

const statusStyles: Record<RepairStatus, string> = {
  PENDING: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  IN_PROGRESS: "border-cyan-500/40 text-cyan-200 bg-cyan-500/10",
  COMPLETED: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
  READY_FOR_PICKUP: "border-orange-500/40 text-orange-200 bg-orange-500/10",
};

const statusLabels: Record<RepairStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  READY_FOR_PICKUP: "Ready for pickup",
};

export function StatusBadge({ status }: { status: RepairStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
