type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  hintPositive?: boolean;
  icon?: string;
  accent?: "primary" | "amber" | "emerald" | "rose" | "cyan" | "violet";
};

const accentMap: Record<string, { color: string; bg: string; glow: string }> = {
  primary: { color: "#4f46e5", bg: "rgba(79,70,229,0.08)",  glow: "rgba(79,70,229,0.2)" },
  amber:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", glow: "rgba(245,158,11,0.2)" },
  emerald: { color: "#10b981", bg: "rgba(16,185,129,0.08)", glow: "rgba(16,185,129,0.2)" },
  rose:    { color: "#f43f5e", bg: "rgba(244,63,94,0.08)",  glow: "rgba(244,63,94,0.2)" },
  cyan:    { color: "#06b6d4", bg: "rgba(6,182,212,0.08)",  glow: "rgba(6,182,212,0.2)" },
  violet:  { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", glow: "rgba(139,92,246,0.2)" },
};

export function StatCard({ label, value, hint, hintPositive, icon = "◈", accent = "primary" }: StatCardProps) {
  const { color, bg } = accentMap[accent] ?? accentMap.primary;

  return (
    <div className="stat-card">
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        borderRadius: "20px 20px 0 0",
      }} />

      {/* Icon */}
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 42, height: 42,
        background: bg,
        borderRadius: 12,
        fontSize: "1.1rem",
        marginBottom: "1rem",
        border: `1px solid ${color}20`,
      }}>
        {icon}
      </div>

      <p style={{
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.13em",
        color: "var(--dim)",
        fontWeight: 600,
        marginBottom: "0.375rem",
      }}>
        {label}
      </p>

      <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.03em" }}>
        {value}
      </p>

      {hint && (
        <p style={{
          fontSize: "0.75rem",
          color: hintPositive ? "#10b981" : "var(--muted)",
          marginTop: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
        }}>
          {hintPositive && "↑ "}{hint}
        </p>
      )}
    </div>
  );
}
