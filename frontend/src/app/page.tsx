"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AuthResponse, Role } from "@/lib/types";

const redirectByRole: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  CUSTOMER: "/dashboard",
  STAFF: "/staff/dashboard",
};

const services = [
  { title: "Screen Replacement", description: "Precision glass and OLED replacements with same-day turnaround.", price: "From LKR 9,500", icon: "📱" },
  { title: "Battery Diagnostics", description: "Safe battery swaps and health checks for longer device life.", price: "From LKR 6,500", icon: "🔋" },
  { title: "Water Damage Recovery", description: "Board-level cleaning and recovery to save critical data.", price: "From LKR 12,500", icon: "💧" },
  { title: "Speaker & Mic Repairs", description: "Crystal-clear audio restoration with genuine parts.", price: "From LKR 4,200", icon: "🔊" },
];

const features = [
  { title: "Live repair tracking", description: "Track every stage from intake to ready for pickup in real time.", icon: "📡" },
  { title: "Bank transfer payments", description: "Upload receipts and get manual verification quickly.", icon: "🏦" },
  { title: "Loyalty discounts", description: "Earn savings after repeat repairs with automatic eligibility.", icon: "🎁" },
];

const stats = [
  { label: "Avg turnaround", value: "12 hrs" },
  { label: "Devices serviced", value: "12k+" },
  { label: "Customer rating", value: "4.9 ★" },
];

const testimonials = [
  { name: "Tharindu P.", quote: "Fast turnaround and constant updates. My phone looked new.", role: "Customer" },
  { name: "Isuri W.", quote: "The repair status updates kept me calm. Great service.", role: "Customer" },
  { name: "Kasun R.", quote: "Payment verification was smooth and the staff was helpful.", role: "Customer" },
];

export default function Home() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await apiFetch<AuthResponse>("/api/auth/me");
        if (active) {
          setAuth(me);
        }
      } catch {
        if (active) {
          setAuth(null);
        }
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const initials = auth?.name
    ? auth.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuth(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", height: 64, gap: "2rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, background: "linear-gradient(135deg, var(--primary), var(--primary-l))",
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, color: "#fff", fontSize: "0.9rem",
              boxShadow: "0 2px 8px rgba(15,118,110,0.32)",
            }}>M</div>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Mobilux</span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1 }}>
            {["Services","Features","Testimonials","Contact"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{
                padding: "0.5rem 0.875rem", borderRadius: "var(--r-md)",
                fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)",
                textDecoration: "none", transition: "all 0.15s",
              }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "var(--bg3)"; (e.target as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.color = "var(--muted)"; }}
              >{item}</a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {authChecked && auth ? (
              <>
                <Link
                  href={redirectByRole[auth.role]}
                  className="btn-ghost"
                  style={{ width: "auto" }}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleLogout}
                  style={{ width: "auto" }}
                >
                  Logout
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "0.5rem" }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: "0.7rem" }}>{initials}</div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 600 }}>
                    {auth.name}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost" style={{ width: "auto" }}>Login</Link>
                <Link href="/signup" className="btn-amber" style={{ width: "auto", padding: "0.6rem 1.25rem" }}>Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1200, margin: "0 auto", padding: "4rem 1.5rem 2rem",
        display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "4rem", alignItems: "center",
      }}>
        <div className="animate-fade-up">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.375rem 0.875rem",
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 999, marginBottom: "1.5rem",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulseSlow 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b45309", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Trusted phone repair hub
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(2.25rem,5vw,3.5rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1.25rem" }}>
            Premium phone repairs<br />
            <span className="gradient-text">with real-time tracking.</span>
          </h1>

          <p style={{ fontSize: "1.05rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 500, marginBottom: "2rem" }}>
            Mobilux keeps you informed, priced fairly in LKR, and back on your device fast.
            Track every repair step and unlock loyalty discounts.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "3rem" }}>
            <Link href="/signup" className="btn-primary" style={{ width: "auto", padding: "0.875rem 1.75rem", fontSize: "0.95rem" }}>
              Book a repair →
            </Link>
            <Link href="/login" className="btn-secondary" style={{ width: "auto", padding: "0.875rem 1.75rem", fontSize: "0.95rem" }}>
              Track a repair
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {stats.map(stat => (
              <div key={stat.label} style={{
                padding: "1rem 1.25rem",
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-xs)",
              }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>{stat.value}</p>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.2rem", fontWeight: 500 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hero cards */}
        <div className="animate-float" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            background: "var(--bg2)", border: "1px solid var(--border)",
            borderRadius: "var(--r-2xl)", padding: "1.5rem",
            boxShadow: "var(--shadow-xl)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>Repair status</p>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.1)", padding: "0.25rem 0.625rem", borderRadius: 999, border: "1px solid rgba(16,185,129,0.2)" }}>
                ● Ready for pickup
              </span>
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.375rem" }}>iPhone 12 Pro</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1.25rem" }}>Screen replacement and diagnostics</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {["Intake", "In progress", "Quality check", "Ready for pickup"].map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: i < 4 ? "linear-gradient(135deg, var(--primary), var(--primary-l))" : "var(--bg3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6rem", color: "#fff", fontWeight: 700, flexShrink: 0,
                  }}>{i < 4 ? "✓" : ""}</div>
                  <span style={{ fontSize: "0.82rem", color: i < 4 ? "var(--text)" : "var(--dim)", fontWeight: i < 4 ? 500 : 400 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-h))",
            borderRadius: "var(--r-2xl)", padding: "1.5rem",
            boxShadow: "0 8px 32px rgba(15,118,110,0.3)",
          }}>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", fontWeight: 500, marginBottom: "0.5rem" }}>Next payment</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: "0.25rem" }}>LKR 22,000</p>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginBottom: "1rem" }}>Upload bank transfer receipt to confirm.</p>
            <button style={{
              width: "100%", padding: "0.7rem", borderRadius: "var(--r-md)",
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              backdropFilter: "blur(8px)", transition: "all 0.15s",
            }}>Upload receipt →</button>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" style={{ maxWidth: 1200, margin: "5rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem", gap: "2rem" }}>
          <div>
            <p className="label" style={{ color: "#b45309", marginBottom: "0.5rem" }}>Services</p>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Phone repairs crafted<br />for speed and trust</h2>
          </div>
          <p style={{ maxWidth: 380, color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            Every repair includes transparent diagnostics, genuine parts, and continuous status updates.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {services.map((s, i) => (
            <div key={s.title} className="animate-fade-up" style={{
              animationDelay: `${i * 60}ms`,
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)", padding: "1.5rem",
              boxShadow: "var(--shadow-sm)", transition: "all 0.2s",
              cursor: "pointer",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,118,110,0.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>{s.icon}</div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.title}</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1.25rem" }}>{s.description}</p>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#b45309" }}>{s.price}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: "6rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <p className="label" style={{ color: "#b45309", marginBottom: "0.5rem" }}>Features</p>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
              Everything you need<br />in one system
            </h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: "2rem" }}>
              Mobilux connects customers, staff, and the owner in a single dashboard with live status, verified payments, and reward tracking.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {features.map(f => (
                <div key={f.title} style={{
                  display: "flex", gap: "1rem", alignItems: "flex-start",
                  padding: "1rem 1.25rem",
                  background: "var(--bg2)", border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-xs)",
                }}>
                  <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.25rem" }}>{f.title}</h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "1.5rem", boxShadow: "var(--shadow-sm)" }}>
              <p className="label" style={{ marginBottom: "1rem" }}>Tracking snapshot</p>
              {[{ label: "Pending", count: 5, color: "#f59e0b", w: "20%" }, { label: "In Progress", count: 12, color: "#06b6d4", w: "48%" }, { label: "Completed", count: 38, color: "#10b981", w: "100%" }].map(item => (
                <div key={item.label} style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{item.count}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg3)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: item.w, background: item.color, borderRadius: 999, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "linear-gradient(135deg,rgba(15,118,110,0.05),rgba(29,78,216,0.08))", border: "1px solid rgba(15,118,110,0.18)", borderRadius: "var(--r-xl)", padding: "1.5rem" }}>
              <p className="label" style={{ marginBottom: "0.875rem" }}>Why Mobilux</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {["Dedicated admin, staff, and customer portals","Manual verification for secure bank transfers","Repair history and discounts in one place","Fast communication and transparent pricing"].map(item => (
                  <li key={item} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", fontSize: "0.85rem", color: "var(--muted)" }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section id="testimonials" style={{ maxWidth: 1200, margin: "6rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p className="label" style={{ color: "#b45309", marginBottom: "0.5rem" }}>Testimonials</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Customers trust Mobilux to deliver</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem" }}>
          {testimonials.map(t => (
            <div key={t.name} style={{
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)", padding: "1.75rem",
              boxShadow: "var(--shadow-sm)",
            }}>
              <p style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>★★★★★</p>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>&quot;{t.quote}&quot;</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: "0.75rem" }}>{t.name[0]}</div>
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--dim)" }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────── */}
      <section id="contact" style={{ maxWidth: 1200, margin: "6rem auto 0", padding: "0 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "2rem" }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--r-2xl)", padding: "2.5rem", boxShadow: "var(--shadow-sm)" }}>
            <p className="label" style={{ color: "#b45309", marginBottom: "0.5rem" }}>Contact</p>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "1rem" }}>Talk to a Mobilux specialist</h2>
            <p style={{ color: "var(--muted)", marginBottom: "2rem", fontSize: "0.9rem", lineHeight: 1.7 }}>
              Visit us in-store or send a message. We respond within one business day.
            </p>
            {[["Phone","+94 11 234 5678"],["Email","support@mobilux.lk"],["Location","Colombo 07, Sri Lanka"],["Hours","9:00 AM – 7:00 PM"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.875rem 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 500 }}>{k}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <form style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--r-2xl)", padding: "2.5rem", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Send a message</h3>
            <input className="input-field" placeholder="Full name" />
            <input className="input-field" placeholder="Email address" type="email" />
            <textarea className="input-field" placeholder="Tell us about the issue" style={{ minHeight: 130, resize: "vertical" }} />
            <button type="button" className="btn-amber" style={{ marginTop: "0.25rem" }}>Submit message</button>
            <p style={{ fontSize: "0.75rem", color: "var(--dim)", textAlign: "center" }}>This form is a demo. Connect it to your support inbox when ready.</p>
          </form>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)", marginTop: "6rem", padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--dim)" }}>© 2025 Mobilux Phone Repair. All prices in LKR.</span>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/login" style={{ fontSize: "0.85rem", color: "var(--muted)", textDecoration: "none" }}>Login</Link>
            <Link href="/signup" style={{ fontSize: "0.85rem", color: "var(--muted)", textDecoration: "none" }}>Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
