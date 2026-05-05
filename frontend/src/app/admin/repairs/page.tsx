"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Sidebar } from "@/app/components/Sidebar";

type RepairLog = {
  id: number; repId: string; owner: string | null; brand: string | null; model: string | null;
  issue: string | null; solution: string | null; completed: boolean;
  cost: number | null; payment: number | null; profit: number | null;
  dateCompleted: string | null; duration: string | null; parts: string | null;
  shop: string | null; comments: string | null; forgottenParts: string | null;
};

const empty: Omit<RepairLog, "id"> = {
  repId: "", owner: null, brand: null, model: null, issue: null, solution: null,
  completed: false, cost: null, payment: null, profit: null, dateCompleted: null,
  duration: null, parts: null, shop: null, comments: null, forgottenParts: null,
};

const fmt = (v: number | null) => v == null ? "—" : `LKR ${v.toLocaleString()}`;
const dash = (v?: string | null) => v || "—";
const profitColor = (v: number | null) => v == null ? "#9aa3bd" : v > 0 ? "#059669" : v < 0 ? "#e11d48" : "#9aa3bd";

// Card accent based on profit + completion
const cardAccent = (r: RepairLog) => {
  if (!r.completed) return { border: "#d97706", bg: "#fffbf0", chip: "rgba(217,119,6,0.12)", chipText: "#92400e" };
  if (r.profit == null || r.profit === 0) return { border: "#4f46e5", bg: "#f5f5ff", chip: "rgba(79,70,229,0.1)", chipText: "#3730a3" };
  if (r.profit > 0) return { border: "#059669", bg: "#f0fdf8", chip: "rgba(5,150,105,0.1)", chipText: "#065f46" };
  return { border: "#e11d48", bg: "#fff1f3", chip: "rgba(225,29,72,0.1)", chipText: "#9f1239" };
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", padding: "0.6rem 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ width: 120, flexShrink: 0, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dim)", paddingTop: 2 }}>{label}</span>
      <span style={{ fontSize: "0.875rem", color: "var(--text)", flex: 1, lineHeight: 1.5, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminRepairsPage() {
  const [logs, setLogs]         = useState<RepairLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [detail, setDetail]     = useState<RepairLog | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<RepairLog | null>(null);
  const [form, setForm]         = useState<Omit<RepairLog, "id">>(empty);
  const [saving, setSaving]     = useState(false);
  const [sortKey, setSortKey]   = useState<"repId" | "owner" | "phone" | "issue" | "status" | "cost" | "payment" | "profit" | "date" | "comments">("date");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [colWidths, setColWidths] = useState([120, 160, 190, 240, 120, 130, 130, 130, 160, 220]);
  const [resizing, setResizing] = useState<{ index: number; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    apiFetch<RepairLog[]>("/api/repair-logs")
      .then(setLogs).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (event: MouseEvent) => {
      setColWidths((prev) => {
        const next = [...prev];
        const delta = event.clientX - resizing.startX;
        next[resizing.index] = Math.max(110, resizing.startWidth + delta);
        return next;
      });
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const q = search.toLowerCase();
  const filtered = logs.filter((r) =>
    !q || [r.repId, r.owner, r.brand, r.model, r.issue].some((v) => v?.toLowerCase().includes(q))
  );
  const getSortValue = (r: RepairLog) => {
    switch (sortKey) {
      case "repId": return r.repId || "";
      case "owner": return r.owner || "";
      case "phone": return [r.brand, r.model].filter(Boolean).join(" ");
      case "issue": return r.issue || "";
      case "status": return r.completed ? "completed" : "pending";
      case "cost": return r.cost ?? 0;
      case "payment": return r.payment ?? 0;
      case "profit": return r.profit ?? 0;
      case "comments": return r.comments || "";
      case "date":
      default:
        return r.dateCompleted ? new Date(r.dateCompleted).getTime() : 0;
    }
  };
  const sorted = [...filtered].sort((a, b) => {
    const av = getSortValue(a);
    const bv = getSortValue(b);
    const dir = sortDir === "asc" ? 1 : -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
  const visible  = sorted;

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "date" ? "desc" : "asc");
  };

  const openAdd  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = (r: RepairLog) => { const { id: _, ...rest } = r; setForm(rest); setEditing(r); setDetail(null); setShowForm(true); };
  const setF     = (k: keyof typeof form, v: string | boolean | number | null) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
  };

  const totalProfit = logs.reduce((s, r) => s + (r.profit ?? 0), 0);
  const totalSpent  = logs.reduce((s, r) => s + (r.cost   ?? 0), 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin" userEmail="admin@mobilux.lk" />

      <main style={{ flex: 1, paddingLeft: 240, minWidth: 0 }}>
        <div style={{ padding: "2rem 1.75rem" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <p className="label" style={{ marginBottom: "0.4rem" }}>Admin Dashboard</p>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>Repair Logs</h1>
            </div>
            <button onClick={openAdd} className="btn-primary" style={{ width: "auto", padding: "0.7rem 1.5rem" }}>+ Add Repair</button>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1rem" }}>⚠ {error}</div>}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.875rem", marginBottom: "1.25rem" }}>
            {[
              { l: "Total",   v: String(logs.length),                   icon: "🔧", c: "#4f46e5" },
              { l: "Done",    v: String(logs.filter((r) => r.completed).length), icon: "✅", c: "#059669" },
              { l: "Spent",   v: `LKR ${totalSpent.toLocaleString()}`,   icon: "💸", c: "#d97706" },
              { l: "Profit",  v: `LKR ${totalProfit.toLocaleString()}`,  icon: "💰", c: totalProfit >= 0 ? "#059669" : "#e11d48" },
            ].map((s) => (
              <div key={s.l} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderTop: `3px solid ${s.c}`, borderRadius: 14, padding: "1rem 1.25rem" }}>
                <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--dim)", marginBottom: "0.375rem" }}>{s.icon} {s.l}</p>
                <p style={{ fontSize: "1.2rem", fontWeight: 700, color: s.c, margin: 0 }}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
            <input className="input-field" style={{ maxWidth: 300 }} placeholder="🔍 Search ID, owner, brand, issue…" value={search} onChange={(e) => { setSearch(e.target.value); }} />
            {search && <button onClick={() => setSearch("")} className="btn-ghost">Clear</button>}
            <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--muted)" }}>
              {filtered.length} records
            </span>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {[
              { c: "#059669", l: "Profit" }, { c: "#e11d48", l: "Loss" },
              { c: "#4f46e5", l: "Break-even" }, { c: "#d97706", l: "Pending" },
            ].map((x) => (
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--muted)" }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: x.c }} />
                {x.l}
              </div>
                {
                  key: "repId", label: "Repair ID"
                },
                  { key: "owner", label: "Owner" },
                  { key: "phone", label: "Phone" },
                  { key: "issue", label: "Issue" },
                  { key: "status", label: "Status" },
                  { key: "cost", label: "Cost" },
                  { key: "payment", label: "Received" },
                  { key: "profit", label: "Profit" },
                  { key: "comments", label: "Comments" },
                  { key: "date", label: "Date" },
                ].map((col, index) => (
                display: "grid",
                gridTemplateColumns: colWidths.map((w) => `${w}px`).join(" "),
                gap: "0.65rem",
                alignItems: "center",
                padding: "0.65rem 1rem",
                borderRadius: 14,
                background: "linear-gradient(135deg, rgba(79,70,229,0.08), rgba(217,119,6,0.08))",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontWeight: 600,
                marginBottom: "0.6rem",
              }}>
                {[
                  { key: "repId", label: "Repair ID" },
                  { key: "owner", label: "Owner" },
                  { key: "phone", label: "Phone" },
                  { key: "issue", label: "Issue" },
                  { key: "status", label: "Status" },
                  { key: "financials", label: "Financials" },
                  { key: "date", label: "Date" },
                  { key: "comments", label: "Comments" },
                ].map((col, index) => (
                  <div
                    key={col.key}
                    style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", position: "relative", paddingRight: 10 }}
                    onClick={() => toggleSort(col.key as typeof sortKey)}
                  >
                    <span>{col.label}</span>
                    {sortKey === col.key && <span style={{ fontSize: "0.65rem" }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    <span
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        setResizing({ index, startX: event.clientX, startWidth: colWidths[index] });
                      }}
                      style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, cursor: "col-resize" }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: "0.65rem" }}>
                {visible.map((r) => {
                  const ac = cardAccent(r);
                  const device = [r.brand, r.model].filter(Boolean).join(" ");
                  return (
                    <div key={r.id} onClick={() => setDetail(r)}
                      style={{
                        background: "var(--bg2)",
                        border: `1.5px solid ${ac.border}30`,
                        borderRadius: 16,
                        padding: "0.7rem 1rem",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                        display: "grid",
                        gridTemplateColumns: colWidths.map((w) => `${w}px`).join(" "),
                        gap: "0.65rem",
                        alignItems: "center",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                        fontFamily: "inherit",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = `0 10px 24px ${ac.border}22`;
                        e.currentTarget.style.borderColor = `${ac.border}80`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "";
                        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
                        e.currentTarget.style.borderColor = `${ac.border}30`;
                      }}
                    >
                      <span style={{
                        fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 800,
                        color: ac.border, letterSpacing: "0.04em",
                        background: `${ac.border}15`, padding: "0.25rem 0 0.25rem 0.6rem",
                        borderRadius: 8, border: `1px solid ${ac.border}25`,
                        whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden",
                      }}>{r.repId}</span>

                      <span style={{ fontSize: "0.9rem", color: "var(--text)", fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {r.owner || "Unknown"}
                      </span>

                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
                        <img src="/phone.svg" alt="Phone" width={18} height={18} style={{ opacity: 0.8 }} />
                        <span style={{ fontSize: "0.82rem", color: "var(--text)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {device || "Unknown"}
                        </span>
                      </span>

                      <span style={{ fontSize: "0.82rem", color: "var(--muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {r.issue || "—"}
                        {r.forgottenParts ? " · ⚠" : ""}
                      </span>

                      <span style={{
                        justifySelf: "start",
                        fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.75rem",
                        borderRadius: 999, background: ac.chip, color: ac.chipText,
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}>
                        {r.completed ? "Completed" : "Pending"}
                      </span>

                      <span style={{ fontSize: "0.78rem", color: "var(--text)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {fmt(r.cost)}
                      </span>

                      <span style={{ fontSize: "0.78rem", color: "var(--text)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {fmt(r.payment)}
                      </span>

                      <span style={{ fontSize: "0.78rem", color: profitColor(r.profit), fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {fmt(r.profit)}
                      </span>

                      <span style={{ fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {r.comments || "—"}
                      </span>

                      <span style={{ fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {r.dateCompleted ? new Date(r.dateCompleted).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No date"}
                        {r.duration ? ` · ${r.duration}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Detail Modal ──────────────────────────────────── */}
      {detail && (
        <div onClick={(e) => e.target === e.currentTarget && setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 18, width: "100%", maxWidth: 580, maxHeight: "88vh", overflowY: "auto", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "1rem", color: cardAccent(detail).border }}>{detail.repId}</span>
                <p style={{ margin: "0.25rem 0 0", fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" }}>{detail.owner || "Unknown"}</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => openEdit(detail)} style={{ fontSize: "0.78rem", padding: "0.4rem 1rem", background: "rgba(79,70,229,0.1)", border: "1px solid rgba(79,70,229,0.25)", color: "var(--primary)", borderRadius: 9, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: 999, background: detail.completed ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)", color: detail.completed ? "#059669" : "#d97706" }}>
                {detail.completed ? "✅ Completed" : "⏳ Pending"}
              </span>
              {detail.brand && <span style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem", borderRadius: 999, background: "rgba(79,70,229,0.1)", color: "var(--primary)", fontWeight: 600 }}>{detail.brand}</span>}
              {detail.model && <span style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem", borderRadius: 999, background: "var(--bg3)", color: "var(--muted)" }}>{detail.model}</span>}
            </div>

            {/* Financials summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {[
                { l: "Cost",   v: fmt(detail.cost),    c: "var(--text)" },
                { l: "Payment",v: fmt(detail.payment),  c: "var(--text)" },
                { l: "Profit", v: fmt(detail.profit),   c: profitColor(detail.profit) },
              ].map((f) => (
                <div key={f.l} style={{ background: "var(--bg3)", borderRadius: 12, padding: "0.875rem 1rem", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--dim)", margin: "0 0 0.3rem" }}>{f.l}</p>
                  <p style={{ fontSize: "1.05rem", fontWeight: 700, color: f.c, margin: 0 }}>{f.v}</p>
                </div>
              ))}
            </div>

            <DetailRow label="Issue"     value={dash(detail.issue)} />
            <DetailRow label="Solution"  value={dash(detail.solution)} />
            <DetailRow label="Date"      value={detail.dateCompleted ? new Date(detail.dateCompleted).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"} />
            <DetailRow label="Duration"  value={dash(detail.duration)} />
            <DetailRow label="Parts"     value={dash(detail.parts)} />
            <DetailRow label="Shop"      value={dash(detail.shop)} />
            {detail.comments && <DetailRow label="Comments" value={<span style={{ color: "var(--muted)", lineHeight: 1.6, fontSize: "0.82rem" }}>{detail.comments}</span>} />}
            {detail.forgottenParts && (
              <DetailRow label="Forgotten" value={<span style={{ color: "#e11d48", fontWeight: 700 }}>⚠ {detail.forgottenParts}</span>} />
            )}
          </div>
        </div>
      )}

      {/* ── Add/Edit Form Modal ───────────────────────────── */}
      {showForm && (
        <div onClick={(e) => e.target === e.currentTarget && setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 18, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>{editing ? `Edit ${editing.repId}` : "New Repair Log"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { l: "Repair ID", k: "repId", ph: "REP-041" },
                { l: "Owner",     k: "owner", ph: "Customer name" },
                { l: "Brand",     k: "brand", ph: "Apple, Samsung…" },
                { l: "Model",     k: "model", ph: "iPhone 13…" },
                { l: "Duration",  k: "duration", ph: "1 Day, 2 Hours…" },
                { l: "Parts Used",k: "parts",    ph: "Display, Battery…" },
                { l: "Parts Shop",k: "shop",     ph: "Trans Asia Cellular…" },
                { l: "Forgotten", k: "forgottenParts", ph: "Any forgotten parts" },
              ].map((f) => (
                <FField key={f.k} label={f.l}>
                  <input className="input-field" value={(form as Record<string, unknown>)[f.k] as string ?? ""} onChange={(e) => setF(f.k as keyof typeof form, e.target.value || null)} placeholder={f.ph} />
                </FField>
              ))}
              <FField label="Issue">
                <textarea className="input-field" rows={2} value={form.issue ?? ""} onChange={(e) => setF("issue", e.target.value || null)} placeholder="Describe the issue" style={{ resize: "vertical" }} />
              </FField>
              <FField label="Solution">
                <textarea className="input-field" rows={2} value={form.solution ?? ""} onChange={(e) => setF("solution", e.target.value || null)} placeholder="What was done" style={{ resize: "vertical" }} />
              </FField>
              <FField label="Date Completed">
                <input className="input-field" type="date" value={form.dateCompleted ?? ""} onChange={(e) => setF("dateCompleted", e.target.value || null)} />
              </FField>
              <FField label="Completed">
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", paddingTop: "0.875rem" }}>
                  <input type="checkbox" checked={form.completed} onChange={(e) => setF("completed", e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} />
                  <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>Mark as completed</span>
                </label>
              </FField>
              {(["cost", "payment", "profit"] as const).map((k) => (
                <FField key={k} label={`${k.charAt(0).toUpperCase() + k.slice(1)} (LKR)`}>
                  <input className="input-field" type="number" value={form[k] ?? ""} onChange={(e) => setF(k, e.target.value ? Number(e.target.value) : null)} placeholder="0" />
                </FField>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <FField label="Comments">
                  <textarea className="input-field" rows={3} value={form.comments ?? ""} onChange={(e) => setF("comments", e.target.value || null)} placeholder="Notes, observations, follow-ups…" style={{ resize: "vertical" }} />
                </FField>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary" style={{ width: "auto", padding: "0.7rem 2rem" }}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add repair"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          main { padding-left: 0 !important; }
          .sidebar { display: none; }
        }
        @media (max-width: 480px) {
          div[style*="minmax(260px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}


