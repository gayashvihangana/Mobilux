"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import { Sidebar } from "@/app/components/Sidebar";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  visible: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiFetch<Product[]>("/api/products")
      .then(setProducts)
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
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>Products</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Manage accessories and product visibility.</p>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1.5rem" }}>⚠ {error}</div>}

          <section className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>All Products</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg3)", padding: "0.25rem 0.75rem", borderRadius: 999 }}>
                {products.length} total
              </span>
            </div>

            {loading ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>Loading…</p>
            ) : products.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No products found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {products.map((p) => (
                  <div key={p.id} className="table-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: "rgba(15,118,110,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
                      }}>📦</div>
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{p.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>{p.category}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
                      <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--primary)" }}>{formatLkr(p.price)}</p>
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: 999,
                        background: p.visible ? "rgba(5,150,105,0.1)" : "rgba(148,163,188,0.1)",
                        color: p.visible ? "#065f46" : "var(--dim)",
                      }}>
                        {p.visible ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
