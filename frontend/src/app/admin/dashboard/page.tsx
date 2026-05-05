"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import type { AdminDashboardResponse, PaymentResponse, RepairResponse } from "@/lib/types";
import { StatusBadge } from "@/app/components/StatusBadge";
import { StatCard } from "@/app/components/StatCard";
import { Sidebar } from "@/app/components/Sidebar";

const fallbackSummary: AdminDashboardResponse = {
  totalRepairs: 86, pendingPayments: 7, activeRepairs: 14, totalRevenue: 462000,
};
const fallbackRepairs: RepairResponse[] = [
  { id: 32, customer: { id: 3, name: "Saman Perera", email: "customer@mobilux.lk", role: "CUSTOMER" }, assignedStaff: { id: 2, name: "Kamal Silva", email: "staff@mobilux.lk", role: "STAFF" }, deviceModel: "iPhone 13", issueDescription: "Camera replacement", status: "IN_PROGRESS", cost: 28500, createdAt: "2025-05-02T08:00:00Z", updatedAt: "2025-05-02T12:30:00Z", completedAt: null },
  { id: 33, customer: { id: 4, name: "Nimal Fernando", email: "customer2@mobilux.lk", role: "CUSTOMER" }, assignedStaff: { id: 2, name: "Kamal Silva", email: "staff@mobilux.lk", role: "STAFF" }, deviceModel: "Samsung Galaxy S22", issueDescription: "Charging port repair", status: "PENDING", cost: 14500, createdAt: "2025-05-01T10:00:00Z", updatedAt: "2025-05-01T10:00:00Z", completedAt: null },
  { id: 34, customer: { id: 3, name: "Saman Perera", email: "customer@mobilux.lk", role: "CUSTOMER" }, assignedStaff: null, deviceModel: "Xiaomi Redmi 10", issueDescription: "Screen cracked", status: "COMPLETED", cost: 9500, createdAt: "2025-04-30T10:00:00Z", updatedAt: "2025-04-30T10:00:00Z", completedAt: "2025-04-30T16:00:00Z" },
  { id: 35, customer: { id: 5, name: "Dilnoza M.", email: "d@mobilux.lk", role: "CUSTOMER" }, assignedStaff: null, deviceModel: "Oppo Reno 8", issueDescription: "Battery swelling", status: "READY_FOR_PICKUP", cost: 7800, createdAt: "2025-04-29T10:00:00Z", updatedAt: "2025-04-29T10:00:00Z", completedAt: null },
];
const fallbackPayments: PaymentResponse[] = [
  { id: 4, repairId: 31, amount: 18000, receiptUrl: "/uploads/receipts/sample-receipt.jpg", status: "PENDING",  createdAt: "2025-05-01T14:00:00Z", updatedAt: "2025-05-01T14:00:00Z" },
  { id: 5, repairId: 30, amount: 9500,  receiptUrl: "/uploads/receipts/sample-receipt.jpg", status: "VERIFIED", createdAt: "2025-04-30T09:00:00Z", updatedAt: "2025-04-30T12:00:00Z" },
  { id: 6, repairId: 29, amount: 14200, receiptUrl: "/uploads/receipts/sample-receipt.jpg", status: "VERIFIED", createdAt: "2025-04-28T09:00:00Z", updatedAt: "2025-04-28T11:00:00Z" },
];

const quickActions = [
  { icon: "🔧", label: "Manage Repairs", desc: "Create & update repair orders", href: "/admin/repairs" },
  { icon: "👥", label: "Manage Users",   desc: "Staff & customer accounts",    href: "/admin/users" },
  { icon: "📦", label: "Products",       desc: "Toggle product visibility",    href: "/admin/products" },
  { icon: "✅", label: "Verify Payments",desc: "Review bank receipts",         href: "/admin/payments" },
];

export default function AdminDashboardPage() {
  const [summary, setSummary]   = useState<AdminDashboardResponse | null>(null);
  const [repairs, setRepairs]   = useState<RepairResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, r, p] = await Promise.all([
          apiFetch<AdminDashboardResponse>("/api/dashboard/admin"),
          apiFetch<RepairResponse[]>("/api/repairs"),
          apiFetch<PaymentResponse[]>("/api/payments"),
        ]);
        if (!active) return;
        setSummary(s); setRepairs(r.slice(0, 4)); setPayments(p.slice(0, 3));
      } catch {
        if (!active) return;
        setError("Backend offline");
        setSummary(fallbackSummary); setRepairs(fallbackRepairs); setPayments(fallbackPayments);
      }
    })();
    return () => { active = false; };
  }, []);

  const s = summary ?? fallbackSummary;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin User" userEmail="admin@mobilux.lk" />

      <main className="page-with-sidebar">
        {/* Topbar */}
        <div className="topbar">
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "0.5rem 0.875rem", maxWidth: 280 }}>
              <span style={{ color: "var(--dim)", fontSize: "0.85rem" }}>🔍</span>
              <input style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.85rem", color: "var(--muted)", width: "100%" }} placeholder="Search repairs, users…" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--muted)" }}>
              🔔
              <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", border: "2px solid white" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: "0.75rem" }}>AU</div>
              <div>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>Admin User</p>
                <p style={{ fontSize: "0.7rem", color: "var(--dim)" }}>admin@mobilux.lk</p>
              </div>
            </div>
          </div>
        </div>

        <div className="page-content">
          {/* Page header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Plan, prioritize, and accomplish your operations with ease.</p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn-ghost" style={{ width: "auto" }}>Import Data</button>
              <button className="btn-primary" style={{ width: "auto", padding: "0.7rem 1.25rem" }}>+ Add Repair</button>
            </div>
          </div>

          {error && <div className="banner-warn" style={{ marginBottom: "1.5rem" }}>⚠ {error} — showing sample data.</div>}

          {/* Stat cards */}
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label="Total Repairs"    value={`${s.totalRepairs}`}       icon="🔧" accent="primary" hint="↑ 12% from last month" hintPositive />
            <StatCard label="Active Repairs"   value={`${s.activeRepairs}`}      icon="⚡" accent="cyan"    hint="Currently in progress" />
            <StatCard label="Pending Payments" value={`${s.pendingPayments}`}    icon="⏳" accent="amber"   hint="Awaiting verification" />
            <StatCard label="Total Revenue"    value={formatLkr(s.totalRevenue)} icon="💰" accent="emerald" hint="↑ 8% from last month" hintPositive />
          </div>

          {/* Main grid */}
          <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>

            {/* Recent Repairs */}
            <section className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div>
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Recent Repairs</h2>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.1rem" }}>Latest repair orders</p>
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--primary)", background: "var(--pglow)", padding: "0.25rem 0.625rem", borderRadius: 999, fontWeight: 600 }}>
                  {repairs.length} items
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {repairs.map((r) => (
                  <div key={r.id} className="table-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "var(--r-md)",
                        background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1rem", flexShrink: 0,
                      }}>📱</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.deviceModel}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.customer.name} · {r.issueDescription}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
                      <StatusBadge status={r.status} />
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>{formatLkr(r.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Payments */}
            <section className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div>
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Payments</h2>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.1rem" }}>Recent transactions</p>
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--amber)", background: "rgba(245,158,11,0.1)", padding: "0.25rem 0.625rem", borderRadius: 999, fontWeight: 600 }}>
                  {payments.length} latest
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {payments.map((p) => (
                  <div key={p.id} style={{
                    padding: "1rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <p style={{ fontSize: "0.72rem", color: "var(--dim)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        Payment #{p.id}
                      </p>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700,
                        color: p.status === "VERIFIED" ? "#059669" : "#d97706",
                        background: p.status === "VERIFIED" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                        border: `1px solid ${p.status === "VERIFIED" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                        padding: "0.2rem 0.5rem", borderRadius: 999, letterSpacing: "0.04em",
                      }}>{p.status}</span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.25rem" }}>Repair #{p.repairId}</p>
                    <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>{formatLkr(p.amount)}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Quick actions */}
          <section className="card" style={{ padding: "1.5rem" }}>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Quick Actions</h2>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.1rem" }}>Jump to management tools</p>
            </div>
            <div className="actions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.875rem" }}>
              {quickActions.map(item => (
                <a key={item.label} href={item.href} style={{
                  display: "flex", flexDirection: "column", gap: "0.625rem",
                  padding: "1.25rem",
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)", cursor: "pointer",
                  transition: "all 0.2s", textDecoration: "none",
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(79,70,229,0.3)"; el.style.background = "var(--bg2)"; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "var(--shadow-md)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.background = "var(--bg3)"; el.style.transform = ""; el.style.boxShadow = ""; }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>{item.label}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.4 }}>{item.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
