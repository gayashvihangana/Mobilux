"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Sidebar } from "@/app/components/Sidebar";

type RepairLog = {
  id: number; repId: string; owner: string | null; brand: string | null; model: string | null;
  issue: string | null; solution: string | null; completed: boolean;
  cost: number | null; payment: number | null; profit: number | null;
  dateCompleted: string | null; duration: string | null; parts: string | null;
  shop: string | null; comments: string | null; forgottenParts: string | null;
};

type SortKey = "repId" | "owner" | "phone" | "issue" | "status" | "cost" | "payment" | "profit" | "date" | "bill";

type Column = { key: SortKey; label: string };

const columns: Column[] = [
  { key: "repId", label: "Repair ID" },
  { key: "owner", label: "Owner" },
  { key: "phone", label: "Phone" },
  { key: "issue", label: "Issue" },
  { key: "status", label: "Status" },
  { key: "cost", label: "Cost" },
  { key: "payment", label: "Received" },
  { key: "profit", label: "Profit" },
  { key: "date", label: "Date" },
  { key: "bill", label: "Bill" },
];

const empty: Omit<RepairLog, "id"> = {
  repId: "", owner: null, brand: null, model: null, issue: null, solution: null,
  completed: false, cost: null, payment: null, profit: null, dateCompleted: null,
  duration: null, parts: null, shop: null, comments: null, forgottenParts: null,
};

const fmt = (v: number | null) => v == null ? "—" : `LKR ${v.toLocaleString()}`;
const dash = (v?: string | null) => v || "—";
const profitColor = (v: number | null) => v == null ? "#9aa3bd" : v > 0 ? "#059669" : v < 0 ? "#e11d48" : "#9aa3bd";

const cardAccent = (r: RepairLog) => {
  if (!r.completed) return { border: "#d97706", chip: "rgba(217,119,6,0.12)", chipText: "#92400e" };
  if (r.profit == null || r.profit === 0) return { border: "#0f766e", chip: "rgba(15,118,110,0.1)", chipText: "#0f766e" };
  if (r.profit > 0) return { border: "#059669", chip: "rgba(5,150,105,0.1)", chipText: "#065f46" };
  return { border: "#e11d48", chip: "rgba(225,29,72,0.1)", chipText: "#9f1239" };
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
  const [sortKey, setSortKey]   = useState<SortKey>("date");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [colWidths, setColWidths] = useState([120, 160, 190, 240, 120, 130, 130, 130, 200, 110]);
  const [resizing, setResizing] = useState<{ index: number; startX: number; startWidth: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
      case "bill": return "";
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
  const visible = sorted;

  const isRightAligned = (key: SortKey) => key === "cost" || key === "payment" || key === "profit" || key === "date";

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "date" ? "desc" : "asc");
  };

  const openAdd  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = (r: RepairLog) => { const { id, ...rest } = r; void id; setForm(rest); setEditing(r); setDetail(null); setShowForm(true); };
  const setF     = (k: keyof typeof form, v: string | boolean | number | null) => setForm((p) => ({ ...p, [k]: v }));

  const confirmDelete = async (r: RepairLog) => {
    const ok = window.confirm(`Delete repair log ${r.repId}? This cannot be undone.`);
    if (!ok) return;
    try {
      await apiFetch(`/api/repair-logs/${r.id}`, { method: "DELETE" });
      setLogs((prev) => prev.filter((log) => log.id !== r.id));
      setDetail(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const triggerImport = () => {
    importInputRef.current?.click();
  };

  const parseMoney = (value?: string | null) => {
    if (!value) return null;
    const cleaned = value.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseBoolean = (value?: string | null) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  };

  const parseCsvRows = (text: string) => {
    const rows: string[][] = [];
    let current: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        current.push(cell);
        cell = "";
        continue;
      }

      if (char === "\n" && !inQuotes) {
        current.push(cell);
        rows.push(current.map((value) => value.trim()));
        current = [];
        cell = "";
        continue;
      }

      if (char === "\r") {
        continue;
      }

      cell += char;
    }

    if (cell.length > 0 || current.length > 0) {
      current.push(cell);
      rows.push(current.map((value) => value.trim()));
    }

    return rows;
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (rows.length < 2) {
        throw new Error("CSV has no data rows.");
      }

      const headers = rows[0].map((h) => h.toLowerCase());
      const getIndex = (name: string) => headers.findIndex((h) => h === name);

      const indexMap = {
        repId: getIndex("repid"),
        owner: getIndex("owner"),
        brand: getIndex("brand"),
        model: getIndex("model"),
        issue: getIndex("issue"),
        solution: getIndex("solution"),
        completed: getIndex("completed"),
        cost: getIndex("cost"),
        payment: getIndex("payment"),
        profit: getIndex("profit"),
        dateCompleted: getIndex("datecompleted"),
        duration: getIndex("duration"),
        parts: getIndex("parts"),
        shop: getIndex("shop"),
        comments: getIndex("comments"),
        forgottenParts: getIndex("forgottenparts"),
      };

      const created: RepairLog[] = [];
      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (row.length === 0 || row.every((cell) => !cell)) continue;
        const payload = {
          repId: row[indexMap.repId] || `REP-${i.toString().padStart(3, "0")}`,
          owner: row[indexMap.owner] || null,
          brand: row[indexMap.brand] || null,
          model: row[indexMap.model] || null,
          issue: row[indexMap.issue] || null,
          solution: row[indexMap.solution] || null,
          completed: parseBoolean(row[indexMap.completed]),
          cost: parseMoney(row[indexMap.cost]),
          payment: parseMoney(row[indexMap.payment]),
          profit: parseMoney(row[indexMap.profit]),
          dateCompleted: row[indexMap.dateCompleted] || null,
          duration: row[indexMap.duration] || null,
          parts: row[indexMap.parts] || null,
          shop: row[indexMap.shop] || null,
          comments: row[indexMap.comments] || null,
          forgottenParts: row[indexMap.forgottenParts] || null,
        } as Omit<RepairLog, "id">;

        const createdLog = await apiFetch<RepairLog>("/api/repair-logs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        created.push(createdLog);
      }

      setLogs((prev) => [...prev, ...created]);
      setError(null);
      alert(`Imported ${created.length} repair logs.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        const u = await apiFetch<RepairLog>(`/api/repair-logs/${editing.id}`, { method: "PUT", body: JSON.stringify({ ...form, id: editing.id }) });
        setLogs((p) => p.map((r) => r.id === editing.id ? u : r));
      } else {
        const c = await apiFetch<RepairLog>("/api/repair-logs", { method: "POST", body: JSON.stringify(form) });
        setLogs((p) => [...p, c]);
      }
      setShowForm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const totalProfit = logs.reduce((s, r) => s + (r.profit ?? 0), 0);
  const totalSpent  = logs.reduce((s, r) => s + (r.cost   ?? 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin" userEmail="admin@mobilux.lk" />

      <main className="page-with-sidebar">
        <div style={{ padding: "2rem 1.75rem" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <p className="label" style={{ marginBottom: "0.4rem" }}>Admin Dashboard</p>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>Repair Logs</h1>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: "none" }}
              />
              <button onClick={triggerImport} className="btn-ghost" style={{ width: "auto" }}>Import Data</button>
              <button onClick={openAdd} className="btn-primary" style={{ width: "auto", padding: "0.7rem 1.5rem" }}>+ Add Repair</button>
            </div>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1rem" }}>⚠ {error}</div>}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
            {[
              { l: "Total",   v: String(logs.length),                   icon: "🔧", c: "#0f766e", bg: "rgba(15,118,110,0.08)" },
              { l: "Done",    v: String(logs.filter((r) => r.completed).length), icon: "✅", c: "#059669", bg: "rgba(5,150,105,0.1)" },
              { l: "Spent",   v: `LKR ${totalSpent.toLocaleString()}`,   icon: "💸", c: "#d97706", bg: "rgba(217,119,6,0.12)" },
              { l: "Profit",  v: `LKR ${totalProfit.toLocaleString()}`,  icon: "💰", c: totalProfit >= 0 ? "#059669" : "#e11d48", bg: totalProfit >= 0 ? "rgba(5,150,105,0.1)" : "rgba(225,29,72,0.12)" },
            ].map((s) => (
              <div key={s.l} style={{
                background: "linear-gradient(135deg, #ffffff 0%, rgba(248,250,252,0.9) 100%)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.9rem",
                boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: s.bg,
                  color: s.c,
                  display: "grid",
                  placeItems: "center",
                  fontSize: "1.1rem",
                }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--dim)", margin: "0 0 0.35rem" }}>{s.l}</p>
                  <p style={{ fontSize: "1.25rem", fontWeight: 700, color: s.c, margin: 0 }}>{s.v}</p>
                </div>
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
              { c: "#0f766e", l: "Break-even" }, { c: "#d97706", l: "Pending" },
            ].map((x) => (
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--muted)" }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: x.c }} />
                {x.l}
              </div>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem", fontFamily: "inherit" }}>Loading…</p>
          ) : visible.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem", fontFamily: "inherit" }}>No records found.</p>
          ) : (
            <div className="repair-table" style={{ marginBottom: "1.75rem" }}>
              <div className="repair-grid" style={{
                display: "grid",
                gridTemplateColumns: colWidths.map((w) => `${w}px`).join(" "),
                gap: "0.65rem",
                alignItems: "center",
                padding: "0.65rem 1rem",
                borderRadius: 14,
                background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(217,119,6,0.08))",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontWeight: 600,
                marginBottom: "0.6rem",
              }}>
                {columns.map((col, index) => (
                  <div
                    key={col.key}
                    className="repair-header-cell"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      cursor: "pointer",
                      position: "relative",
                      paddingRight: 10,
                      justifySelf: isRightAligned(col.key) ? "end" : "start",
                      textAlign: isRightAligned(col.key) ? "right" : "left",
                    }}
                    onClick={() => toggleSort(col.key)}
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
                  const billTarget = String(r.id);
                  return (
                    <div key={r.id} onClick={() => setDetail(r)}
                      className="repair-grid repair-row"
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
                      <span className="repair-cell" style={{
                        fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 800,
                        color: ac.border, letterSpacing: "0.04em",
                        background: `${ac.border}15`, padding: "0.25rem 0 0.25rem 0.6rem",
                        borderRadius: 8, border: `1px solid ${ac.border}25`,
                        whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden",
                      }}>{r.repId}</span>

                      <span className="repair-cell" style={{ fontSize: "0.9rem", color: "var(--text)", fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {r.owner || "Unknown"}
                      </span>

                      <span className="repair-cell" style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
                        <img src="/phone.svg" alt="Phone" width={18} height={18} style={{ opacity: 0.8 }} />
                        <span style={{ fontSize: "0.82rem", color: "var(--text)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {device || "Unknown"}
                        </span>
                      </span>

                      <span className="repair-cell" style={{ fontSize: "0.82rem", color: "var(--muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {r.issue || "—"}
                        {r.forgottenParts ? " · ⚠" : ""}
                      </span>

                      <span className="repair-cell" style={{
                        justifySelf: "start",
                        fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.75rem",
                        borderRadius: 999, background: ac.chip, color: ac.chipText,
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}>
                        {r.completed ? "Completed" : "Pending"}
                      </span>

                      <span className="repair-cell" style={{ fontSize: "0.78rem", color: "var(--text)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", textAlign: "right", justifySelf: "end" }}>
                        {fmt(r.cost)}
                      </span>

                      <span className="repair-cell" style={{ fontSize: "0.78rem", color: "var(--text)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", textAlign: "right", justifySelf: "end" }}>
                        {fmt(r.payment)}
                      </span>

                      <span className="repair-cell" style={{ fontSize: "0.78rem", color: profitColor(r.profit), fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", textAlign: "right", justifySelf: "end" }}>
                        {fmt(r.profit)}
                      </span>

                      <span className="repair-cell repair-date" style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "right", justifySelf: "end" }}>
                        <span style={{ display: "block" }}>
                          {r.dateCompleted ? new Date(r.dateCompleted).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No date"}
                        </span>
                        {r.duration && <span style={{ display: "block", color: "var(--dim)" }}>{r.duration}</span>}
                      </span>

                      <span className="repair-cell" style={{ justifySelf: "end" }}>
                        <Link
                          href={`/admin/bills?repairLogId=${encodeURIComponent(billTarget)}`}
                          className="btn-ghost"
                          onClick={(event) => event.stopPropagation()}
                          style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.75rem" }}
                        >
                          Bill
                        </Link>
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
                <button onClick={() => openEdit(detail)} style={{ fontSize: "0.78rem", padding: "0.4rem 1rem", background: "rgba(15,118,110,0.1)", border: "1px solid rgba(15,118,110,0.25)", color: "var(--primary)", borderRadius: 9, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                <button onClick={() => confirmDelete(detail)} style={{ fontSize: "0.78rem", padding: "0.4rem 1rem", background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.25)", color: "#be123c", borderRadius: 9, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: 999, background: detail.completed ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)", color: detail.completed ? "#059669" : "#d97706" }}>
                {detail.completed ? "✅ Completed" : "⏳ Pending"}
              </span>
              {detail.brand && <span style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem", borderRadius: 999, background: "rgba(15,118,110,0.1)", color: "var(--primary)", fontWeight: 600 }}>{detail.brand}</span>}
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
        .repair-table { overflow-x: auto; }
        .repair-grid { width: 100%; }
        .repair-row .repair-cell { white-space: nowrap; }
        .repair-date { white-space: normal; }
        @media (max-width: 768px) {
          main { padding-left: 0 !important; }
          .sidebar { display: none; }
          .repair-row .repair-cell {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .repair-date {
            text-align: left;
            display: block;
            -webkit-line-clamp: unset;
          }
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
