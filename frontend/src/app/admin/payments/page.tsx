"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import type { PaymentResponse } from "@/lib/types";
import { Sidebar } from "@/app/components/Sidebar";

const paymentStatusStyle: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: "rgba(217,119,6,0.1)",  color: "#92400e" },
  VERIFIED: { bg: "rgba(5,150,105,0.1)",  color: "#065f46" },
  REJECTED: { bg: "rgba(225,29,72,0.1)",  color: "#9f1239" },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiFetch<PaymentResponse[]>("/api/payments")
      .then(setPayments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin" userEmail="admin@mobilux.lk" />
      <main className="page-with-sidebar" style={{ flex: 1 }}>
        <div className="page-content">
          <div style={{ marginBottom: "2rem" }}>
            <p className="label" style={{ marginBottom: "0.5rem" }}>Admin Dashboard</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>Payments</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Review and verify bank transfer receipts.</p>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1.5rem" }}>⚠ {error}</div>}

          <section className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>All Payments</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg3)", padding: "0.25rem 0.75rem", borderRadius: 999 }}>
                {payments.length} total
              </span>
            </div>

            {loading ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>Loading…</p>
            ) : payments.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No payments found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {payments.map((p) => {
                  const s = paymentStatusStyle[p.status] ?? paymentStatusStyle.PENDING;
                  return (
                    <div key={p.id} className="table-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: "rgba(79,70,229,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
                        }}>💳</div>
                        <div>
                          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                            Payment #{p.id}
                          </p>
                          <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Repair #{p.repairId}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
                        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary)" }}>{formatLkr(p.amount)}</p>
                        <span style={{
                          fontSize: "0.72rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: 999,
                          background: s.bg, color: s.color,
                        }}>{p.status}</span>
                        {p.receiptUrl && (
                          <a href={`http://localhost:8080${p.receiptUrl}`} target="_blank" rel="noreferrer"
                            style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
                            View receipt →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
