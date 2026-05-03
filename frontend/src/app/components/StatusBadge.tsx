import type { RepairStatus } from "@/lib/types";

const styles: Record<RepairStatus, { bg: string; color: string; dot: string }> = {
  PENDING:          { bg: "rgba(245,158,11,0.12)",  color: "#fcd34d", dot: "#f59e0b" },
  IN_PROGRESS:      { bg: "rgba(6,182,212,0.12)",   color: "#67e8f9", dot: "#06b6d4" },
  COMPLETED:        { bg: "rgba(16,185,129,0.12)",  color: "#6ee7b7", dot: "#10b981" },
  READY_FOR_PICKUP: { bg: "rgba(249,115,22,0.12)",  color: "#fdba74", dot: "#f97316" },
};

const labels: Record<RepairStatus, string> = {
  PENDING:          "Pending",
  IN_PROGRESS:      "In Progress",
  COMPLETED:        "Completed",
  READY_FOR_PICKUP: "Ready for Pickup",
};

export function StatusBadge({ status }: { status: RepairStatus }) {
  const s = styles[status] ?? styles.PENDING;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.375rem",
      padding: "0.3rem 0.75rem",
      background: s.bg,
      color: s.color,
      borderRadius: 999,
      fontSize: "0.72rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {labels[status]}
    </span>
  );
}
