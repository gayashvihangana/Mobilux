import type { RepairStatus } from "@/lib/types";

const statusMap: Record<RepairStatus, { bg: string; color: string; dot: string; label: string }> = {
  PENDING:          { bg: "rgba(245,158,11,0.1)",  color: "#d97706", dot: "#f59e0b", label: "Pending" },
  IN_PROGRESS:      { bg: "rgba(6,182,212,0.1)",   color: "#0891b2", dot: "#06b6d4", label: "In Progress" },
  COMPLETED:        { bg: "rgba(16,185,129,0.1)",  color: "#059669", dot: "#10b981", label: "Completed" },
  READY_FOR_PICKUP: { bg: "rgba(249,115,22,0.1)",  color: "#ea580c", dot: "#f97316", label: "Ready for Pickup" },
};

export function StatusBadge({ status }: { status: RepairStatus }) {
  const s = statusMap[status] ?? statusMap.PENDING;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.25rem 0.625rem",
      background: s.bg,
      color: s.color,
      borderRadius: 999,
      fontSize: "0.7rem",
      fontWeight: 700,
      letterSpacing: "0.04em",
      border: `1px solid ${s.dot}30`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}
