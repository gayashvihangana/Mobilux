import type { ReactNode } from "react";
import Link from "next/link";

type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        height: 60,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "0 2rem",
        gap: "1rem",
      }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none",
        }}>
          <div style={{
            width: 30, height: 30,
            background: "linear-gradient(135deg, #0f766e, #14b8a6)",
            borderRadius: 8, display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.85rem",
          }}>M</div>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Mobilux</span>
        </Link>
        {actions && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {actions}
          </div>
        )}
      </header>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <p className="label" style={{ marginBottom: "0.375rem" }}>{title}</p>
          {subtitle && <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
