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
];
const fallbackPayments: PaymentResponse[] = [
  { id: 4, repairId: 31, amount: 18000, receiptUrl: "/uploads/receipts/sample-receipt.jpg", status: "PENDING",  createdAt: "2025-05-01T14:00:00Z", updatedAt: "2025-05-01T14:00:00Z" },
  { id: 5, repairId: 30, amount: 9500,  receiptUrl: "/uploads/receipts/sample-receipt.jpg", status: "VERIFIED", createdAt: "2025-04-30T09:00:00Z", updatedAt: "2025-04-30T12:00:00Z" },
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
        setSummary(s);
        setRepairs(r.slice(0, 5));
        setPayments(p.slice(0, 5));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load");
        setSummary(fallbackSummary);
        setRepairs(fallbackRepairs);
        setPayments(fallbackPayments);
      }
    })();
    return () => { active = false; };
  }, []);

  const s = summary ?? fallbackSummary;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin" userEmail="admin@mobilux.lk" />

      <main className="page-with-sidebar" style={{ flex: 1 }}>
        <div className="page-content">

          {/* Header */}
          <div style={{ marginBottom: "2rem" }}>
            <p className="label" style={{ marginBottom: "0.5rem" }}>Admin Dashboard</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>Overview</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              Payments, repair operations, and key metrics at a glance.
            </p>
          </div>

          {error && (
            <div className="banner-warn" style={{ marginBottom: "1.5rem" }}>
              ⚠ {error} — showing sample data.
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            <StatCard label="Total Repairs"    value={`${s.totalRepairs}`}          icon="🔧" accent="primary" />
            <StatCard label="Active Repairs"   value={`${s.activeRepairs}`}         icon="⚡" accent="cyan"    />
            <StatCard label="Pending Payments" value={`${s.pendingPayments}`}        icon="⏳" accent="amber"   />
            <StatCard label="Total Revenue"    value={formatLkr(s.totalRevenue)}    icon="💰" accent="emerald" />
          </div>

          {/* Main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: "1.25rem", marginBottom: "1.25rem" }}>

            {/* Recent repairs */}
            <section className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>Recent Repairs</h2>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg3)", padding: "0.25rem 0.75rem", borderRadius: 999 }}>
                  {repairs.length} items
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {repairs.map((r) => (
                  <div key={r.id} className="table-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: "rgba(99,102,241,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1rem", flexShrink: 0,
                      }}>📱</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.deviceModel}
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.issueDescription}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
                      <StatusBadge status={r.status} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>{formatLkr(r.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Payments */}
            <section className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>Payments</h2>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg3)", padding: "0.25rem 0.75rem", borderRadius: 999 }}>
                  {payments.length} latest
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {payments.map((p) => (
                  <div key={p.id} style={{
                    padding: "1rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <p className="label">Payment #{p.id}</p>
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 600,
                        color: p.status === "VERIFIED" ? "#6ee7b7" : "#fcd34d",
                        background: p.status === "VERIFIED" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                        padding: "0.2rem 0.6rem", borderRadius: 999,
                      }}>{p.status}</span>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: "0.25rem" }}>Repair #{p.repairId}</p>
                    <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary-h)" }}>{formatLkr(p.amount)}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Quick actions */}
          <section className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginBottom: "1.25rem" }}>
              Management Quick Actions
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
              {[
                { icon: "🔧", label: "Create & update repairs" },
                { icon: "👥", label: "Manage staff & customers" },
                { icon: "📦", label: "Toggle product visibility" },
                { icon: "✅", label: "Verify bank receipts" },
              ].map((item) => (
                <div key={item.label} style={{
                  padding: "1rem",
                  background: "var(--bg3)",
                  border: "1px solid var(--border2)",
                  borderRadius: 12,
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                >
                  <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                  <p style={{ fontSize: "0.825rem", color: "var(--muted)", lineHeight: 1.4 }}>{item.label}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
