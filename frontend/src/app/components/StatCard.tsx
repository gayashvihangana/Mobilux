type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  hintPositive?: boolean;
  icon?: string;
  accent?: "primary" | "amber" | "emerald" | "rose" | "cyan" | "violet";
};

const accentMap: Record<string, { color: string; bg: string; glow: string }> = {
  primary: { color: "#0f766e", bg: "rgba(15,118,110,0.08)",  glow: "rgba(15,118,110,0.2)" },
  amber:   { color: "#d97706", bg: "rgba(217,119,6,0.08)",  glow: "rgba(217,119,6,0.2)" },
  emerald: { color: "#059669", bg: "rgba(5,150,105,0.08)",  glow: "rgba(5,150,105,0.2)" },
  rose:    { color: "#e11d48", bg: "rgba(225,29,72,0.08)",  glow: "rgba(225,29,72,0.2)" },
  cyan:    { color: "#0891b2", bg: "rgba(8,145,178,0.08)",  glow: "rgba(8,145,178,0.2)" },
  violet:  { color: "#1d4ed8", bg: "rgba(29,78,216,0.08)",  glow: "rgba(29,78,216,0.2)" },
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
