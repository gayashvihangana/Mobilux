"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AuthResponse, Role } from "@/lib/types";

const redirectByRole: Record<Role, string> = {
  ADMIN:    "/admin/dashboard",
  CUSTOMER: "/dashboard",
  STAFF:    "/staff/dashboard",
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await apiFetch<AuthResponse>("/api/auth/me");
        if (active) {
          router.replace(redirectByRole[me.role]);
        }
      } catch {
        // Not logged in
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<AuthResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      router.push(redirectByRole[res.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>

      {/* ── RIGHT: Brand panel ─────────────────────────── */}
      <div style={{
        flex: "0 0 40%",
        background: "linear-gradient(145deg, #4f46e5 0%, #7c3aed 60%, #4338ca 100%)",
        borderRight: "1px solid rgba(255,255,255,0.15)",
        display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "4rem 3rem",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "-40px", left: "-40px", width: 200, height: 200, background: "rgba(99,102,241,0.18)", borderRadius: "50%", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "60px", right: "-30px", width: 160, height: 160, background: "rgba(139,92,246,0.15)", borderRadius: "50%", filter: "blur(50px)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <p className="label" style={{ marginBottom: "1.25rem", color: "rgba(255,255,255,0.55)" }}>Why Mobilux</p>
          {[
            { icon: "📡", text: "Live repair tracking in real-time" },
            { icon: "📎", text: "Upload bank transfer receipts easily" },
            { icon: "🎁", text: "Loyalty discounts after repeat repairs" },
            { icon: "🛡️", text: "Transparent pricing in LKR" },
          ].map((f) => (
            <div key={f.text} style={{
              display: "flex", alignItems: "flex-start", gap: "0.875rem",
              marginBottom: "1.25rem",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", flexShrink: 0,
              }}>{f.icon}</div>
              <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5, paddingTop: "0.5rem" }}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── LEFT: Form ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "3rem 4rem", position: "relative",
      }}>
        <div style={{
          position: "absolute", top: "30%", right: "20%",
          width: 280, height: 280,
          background: "var(--pglow)",
          borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none",
        }} />

        <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
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
            Create account
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "2rem" }}>
            Manage your repairs, payments, and discounts in one place.
          </p>

          {error && <div className="banner-error" style={{ marginBottom: "1.25rem" }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { label: "Full name",    id: "signup-name",     type: "text",     placeholder: "John Silva",         val: name,     set: setName },
              { label: "Email address",id: "signup-email",    type: "email",    placeholder: "you@example.com",    val: email,    set: setEmail },
              { label: "Password",     id: "signup-password", type: "password", placeholder: "Min. 8 characters",  val: password, set: setPassword },
            ].map((f) => (
              <div key={f.id}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>{f.label}</label>
                <input
                  id={f.id}
                  className="input-field"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  minLength={f.id === "signup-password" ? 8 : undefined}
                  required
                />
              </div>
            ))}
            <button id="signup-submit" type="submit" disabled={loading} className="btn-primary" style={{ marginTop: "0.5rem" }}>
              {loading ? "Creating account…" : "Create account →"}
            </button>
          </form>

          <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--muted)", textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--primary-h)", textDecoration: "none", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
