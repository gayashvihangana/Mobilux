"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AuthResponse, Role } from "@/lib/types";

const redirectByRole: Record<Role, string> = {
  ADMIN:    "/admin/dashboard",
  CUSTOMER: "/dashboard",
  STAFF:    "/staff/dashboard",
};

const demoAccounts = [
  { role: "Admin",    email: "admin@mobilux.lk",    pass: "Admin@123", color: "#818cf8", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)" },
  { role: "Staff",    email: "staff@mobilux.lk",    pass: "password",  color: "#67e8f9", bg: "rgba(6,182,212,0.1)",  border: "rgba(6,182,212,0.2)" },
  { role: "Customer", email: "customer@mobilux.lk", pass: "password",  color: "#6ee7b7", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(redirectByRole[res.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>

      {/* ── LEFT: Form ─────────────────────────────────────── */}
      <div style={{ flex: "0 0 52%", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", position: "relative" }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "20%", left: "10%",
          width: 350, height: 350,
          background: "radial-gradient(ellipse, rgba(79,70,229,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "5%",
          width: 250, height: 250,
          background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }} className="animate-fade-up">
          {/* Logo */}
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", marginBottom: "2.5rem" }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg,#4f46e5,#8b5cf6)",
              borderRadius: 10, display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.9rem",
              boxShadow: "0 2px 8px rgba(79,70,229,0.35)",
            }}>M</div>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>Mobilux</span>
          </Link>

          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "0.375rem" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "2rem" }}>
            Sign in to manage repairs, track progress, and confirm payments.
          </p>

          {error && <div className="banner-error" style={{ marginBottom: "1.25rem" }}>⚠ {error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
                Email address
              </label>
              <input
                id="login-email"
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>Password</label>
                <a href="#" style={{ fontSize: "0.78rem", color: "var(--primary-h)", textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
              </div>
              <input
                id="login-password"
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button id="login-submit" type="submit" disabled={loading} className="btn-primary" style={{ marginTop: "0.25rem" }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--muted)", textAlign: "center" }}>
            New to Mobilux?{" "}
            <Link href="/signup" style={{ color: "var(--primary-h)", textDecoration: "none", fontWeight: 600 }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Brand panel ──────────────────────────────── */}
      <div style={{
        flex: "0 0 48%",
        background: "linear-gradient(145deg, #09090f 0%, #0f0e2a 50%, #0a0a1a 100%)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "4rem 3rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative glows */}
        <div style={{ position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: "radial-gradient(ellipse, rgba(79,70,229,0.25) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "-40px", width: 300, height: 300, background: "radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "30%", left: "-60px", width: 200, height: 200, background: "radial-gradient(ellipse, rgba(6,182,212,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }} className="animate-fade-in">
          {/* Brand */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.625rem",
              marginBottom: "1.5rem",
            }}>
              <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#4f46e5,#8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.95rem", boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>M</div>
              <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Mobilux</span>
            </div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", lineHeight: 1.3, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
              Your repair hub,<br />one login away.
            </h2>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
              Manage repairs, verify payments, and track progress — all in one unified platform.
            </p>
          </div>

          {/* Demo accounts */}
          <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: "0.875rem" }}>Demo access</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
            {demoAccounts.map(item => (
              <div key={item.role} style={{
                background: item.bg,
                border: `1px solid ${item.border}`,
                borderRadius: "var(--r-md)",
                padding: "0.875rem 1rem",
              }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: item.color, marginBottom: "0.3rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {item.role}
                </p>
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontFamily: "ui-monospace, monospace" }}>
                  {item.email} / {item.pass}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--r-md)", padding: "1rem",
          }}>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              💡 Start with the admin dashboard to manage repairs, then switch to staff or customer views.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
