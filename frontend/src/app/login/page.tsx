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

      {/* ── LEFT: Form ─────────────────────────────────── */}
      <div style={{
        flex: "0 0 55%", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "3rem 4rem", position: "relative",
      }}>
        {/* Subtle bg glow */}
        <div style={{
          position: "absolute", top: "30%", left: "20%",
          width: 300, height: 300,
          background: "var(--pglow)",
          borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none",
        }} />

        <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", marginBottom: "2.5rem" }}>
            <div style={{
              width: 38, height: 38,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 10, display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "1rem",
            }}>M</div>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>Mobilux</span>
          </Link>

          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem", lineHeight: 1.2 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "2rem" }}>
            Sign in to manage repairs, track progress, and confirm payments.
          </p>

          {error && <div className="banner-error" style={{ marginBottom: "1.25rem" }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
                Password
              </label>
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
            <button id="login-submit" type="submit" disabled={loading} className="btn-primary" style={{ marginTop: "0.5rem" }}>
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

      {/* ── RIGHT: Brand panel ─────────────────────────── */}
      <div style={{
        flex: "0 0 45%",
        background: "linear-gradient(145deg, #4f46e5 0%, #7c3aed 60%, #4338ca 100%)",
        borderLeft: "1px solid rgba(255,255,255,0.15)",
        display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "4rem 3rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: 220, height: 220, background: "rgba(99,102,241,0.2)", borderRadius: "50%", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "80px", left: "-40px", width: 180, height: 180, background: "rgba(139,92,246,0.15)", borderRadius: "50%", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-40px", right: "40px", width: 140, height: 140, background: "rgba(245,158,11,0.1)", borderRadius: "50%", filter: "blur(40px)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <p className="label" style={{ marginBottom: "1.25rem", color: "rgba(255,255,255,0.55)" }}>Demo access</p>

          {[
            { role: "Admin",    email: "admin@mobilux.lk",    pass: "Admin@123", color: "#c7d2fe" },
            { role: "Staff",    email: "staff@mobilux.lk",    pass: "password",  color: "#a5f3fc" },
            { role: "Customer", email: "customer@mobilux.lk", pass: "password",  color: "#6ee7b7" },
          ].map((item) => (
            <div key={item.role} style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12, padding: "0.875rem 1rem", marginBottom: "0.75rem",
            }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: item.color, marginBottom: "0.3rem" }}>{item.role}</p>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                {item.email} / {item.pass}
              </p>
            </div>
          ))}

          <div style={{
            marginTop: "2rem", padding: "1rem",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
          }}>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              💡 Start with the admin dashboard to manage repairs, then switch to staff or customer views.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
