type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  accent?: "primary" | "amber" | "emerald" | "rose" | "cyan";
};

const accentMap: Record<string, { color: string; bg: string }> = {
  primary: { color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  amber:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  emerald: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  rose:    { color: "#f43f5e", bg: "rgba(244,63,94,0.12)"  },
  cyan:    { color: "#06b6d4", bg: "rgba(6,182,212,0.12)"  },
};

export function StatCard({ label, value, hint, icon = "◈", accent = "primary" }: StatCardProps) {
  const { color, bg } = accentMap[accent] ?? accentMap.primary;

  return (
    <div className="stat-card">
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />

      {/* Icon */}
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 40, height: 40,
        background: bg,
        borderRadius: 10,
        fontSize: "1.1rem",
        marginBottom: "1rem",
      }}>
        {icon}
      </div>

      <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--dim)", marginBottom: "0.5rem" }}>
        {label}
      </p>
      <p style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
        {value}
      </p>
      {hint && (
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.5rem" }}>{hint}</p>
      )}
    </div>
  );
}
