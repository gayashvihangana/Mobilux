import type { RepairStatus } from "@/lib/types";

const statusMap: Record<RepairStatus, { bg: string; color: string; dot: string; label: string }> = {
  PENDING:          { bg: "rgba(217,119,6,0.1)",  color: "#b45309", dot: "#d97706", label: "Pending" },
  IN_PROGRESS:      { bg: "rgba(8,145,178,0.1)",  color: "#0e7490", dot: "#0891b2", label: "In Progress" },
  COMPLETED:        { bg: "rgba(5,150,105,0.1)",  color: "#047857", dot: "#059669", label: "Completed" },
  READY_FOR_PICKUP: { bg: "rgba(234,88,12,0.1)",  color: "#c2410c", dot: "#ea580c", label: "Ready for Pickup" },
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
