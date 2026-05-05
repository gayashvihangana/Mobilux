"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Sidebar } from "@/app/components/Sidebar";
import type { Role } from "@/lib/types";

type UserSummary = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

const roleStyle: Record<string, { bg: string; color: string }> = {
  ADMIN:    { bg: "rgba(79,70,229,0.1)",  color: "#4338ca" },
  STAFF:    { bg: "rgba(8,145,178,0.1)",  color: "#0e7490" },
  CUSTOMER: { bg: "rgba(5,150,105,0.1)",  color: "#065f46" },
};

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<UserSummary[]>([]);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<UserSummary[]>("/api/users")
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin" userEmail="admin@mobilux.lk" />
      <main className="page-with-sidebar">
        <div className="page-content">
          <div style={{ marginBottom: "2rem" }}>
            <p className="label" style={{ marginBottom: "0.5rem" }}>Admin Dashboard</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>Users</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Manage staff, customers, and administrator accounts.</p>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1.5rem" }}>⚠ {error}</div>}

          <section className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>All Users</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg3)", padding: "0.25rem 0.75rem", borderRadius: 999 }}>
                {users.length} total
              </span>
            </div>

            {loading ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>Loading…</p>
            ) : users.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No users found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {users.map((u) => {
                  const s = roleStyle[u.role] ?? roleStyle.CUSTOMER;
                  return (
                    <div key={u.id} className="table-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.9rem", fontWeight: 700, color: "#fff",
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{u.name}</p>
                          <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{u.email}</p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 600, padding: "0.3rem 0.875rem", borderRadius: 999,
                        background: s.bg, color: s.color,
                      }}>{u.role}</span>
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
