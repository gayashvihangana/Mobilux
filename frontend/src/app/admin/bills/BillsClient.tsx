"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import type { AuthResponse, BillItemInput, BillResponse, RepairResponse } from "@/lib/types";
import { Sidebar } from "@/app/components/Sidebar";

type RepairLogResponse = {
  id: number;
  repId: string;
  owner: string | null;
  brand: string | null;
  model: string | null;
  issue: string | null;
  solution: string | null;
  completed: boolean;
  cost: number | null;
  payment: number | null;
  profit: number | null;
  dateCompleted: string | null;
  duration: string | null;
  parts: string | null;
  shop: string | null;
  comments: string | null;
  forgottenParts: string | null;
};

const emptyItem: BillItemInput = { description: "", quantity: 1, unitPrice: 0 };

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  DRAFT: { bg: "rgba(148,163,184,0.15)", color: "#64748b", border: "rgba(148,163,184,0.35)" },
  ISSUED: { bg: "rgba(15,118,110,0.12)", color: "#0f766e", border: "rgba(15,118,110,0.3)" },
  PAID: { bg: "rgba(5,150,105,0.12)", color: "#047857", border: "rgba(5,150,105,0.3)" },
};

export default function AdminBillsClient() {
  const searchParams = useSearchParams();
  const [repairs, setRepairs] = useState<RepairResponse[]>([]);
  const [repairLogs, setRepairLogs] = useState<RepairLogResponse[]>([]);
  const [bills, setBills] = useState<BillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeBill, setActiveBill] = useState<BillResponse | null>(null);
  const [repairSearch, setRepairSearch] = useState("");
  const [repairLogSearch, setRepairLogSearch] = useState("");
  const [sourceMode, setSourceMode] = useState<"repair" | "repair-log">("repair");
  const [authUser, setAuthUser] = useState<AuthResponse | null>(null);

  const [form, setForm] = useState({
    repairId: "",
    repairLogId: "",
    customerName: "",
    customerEmail: "",
    deviceModel: "",
    issueDescription: "",
    repairmanName: "",
    spareParts: "",
    discount: "0",
    taxRate: "0",
    amountPaid: "0",
    loyaltyPoints: "0",
    invoiceStatus: "DRAFT",
    paymentMethod: "CASH",
    notes: "",
    items: [{ ...emptyItem }],
  });

  const switchSourceMode = (mode: "repair" | "repair-log") => {
    setSourceMode(mode);
    setForm((prev) => ({
      ...prev,
      repairId: mode === "repair" ? prev.repairId : "",
      repairLogId: mode === "repair-log" ? prev.repairLogId : "",
    }));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [repairData, repairLogData, billData] = await Promise.all([
          apiFetch<RepairResponse[]>("/api/repairs"),
          apiFetch<RepairLogResponse[]>("/api/repair-logs"),
          apiFetch<BillResponse[]>("/api/bills"),
        ]);
        if (!active) return;
        setRepairs(repairData);
        setRepairLogs(repairLogData);
        setBills(billData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load billing data");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const repairIdParam = searchParams.get("repairId");
    const repairLogIdParam = searchParams.get("repairLogId");
    if (repairLogIdParam) {
      switchSourceMode("repair-log");
      setRepairLogSearch(repairLogIdParam);
      return;
    }
    if (repairIdParam) {
      switchSourceMode("repair");
      setRepairSearch(repairIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await apiFetch<AuthResponse>("/api/auth/me");
        if (!active) return;
        setAuthUser(me);
        setForm((prev) => (prev.repairmanName ? prev : { ...prev, repairmanName: me.name }));
      } catch {
        if (active) setAuthUser(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedRepair = useMemo(() => {
    const id = Number(form.repairId || 0);
    return repairs.find((r) => r.id === id) ?? null;
  }, [form.repairId, repairs]);

  const selectedRepairLog = useMemo(() => {
    const id = Number(form.repairLogId || 0);
    return repairLogs.find((r) => r.id === id) ?? null;
  }, [form.repairLogId, repairLogs]);

  const existingBill = useMemo(() => {
    if (sourceMode === "repair" && selectedRepair) {
      return bills.find((b) => b.repairId === selectedRepair.id) ?? null;
    }
    if (sourceMode === "repair-log" && selectedRepairLog) {
      return bills.find((b) => b.repairLogId === selectedRepairLog.id) ?? null;
    }
    return null;
  }, [bills, selectedRepair, selectedRepairLog, sourceMode]);

  const filteredRepairs = useMemo(() => {
    const term = repairSearch.trim().toLowerCase();
    if (!term) return repairs;
    return repairs.filter((repair) => [
      String(repair.id),
      repair.deviceModel,
      repair.issueDescription,
      repair.customer.name,
      repair.customer.email,
    ].some((value) => value.toLowerCase().includes(term)));
  }, [repairs, repairSearch]);

  const filteredRepairLogs = useMemo(() => {
    const term = repairLogSearch.trim().toLowerCase();
    if (!term) return repairLogs;
    return repairLogs.filter((log) => [
      log.repId,
      log.owner ?? "",
      log.brand ?? "",
      log.model ?? "",
      log.issue ?? "",
    ].some((value) => value.toLowerCase().includes(term)));
  }, [repairLogs, repairLogSearch]);

  useEffect(() => {
    const term = repairSearch.trim();
    if (!term) return;
    const match = repairs.find((repair) => String(repair.id) === term);
    if (match) {
      setForm((prev) => ({ ...prev, repairId: String(match.id) }));
    }
  }, [repairSearch, repairs]);

  useEffect(() => {
    const term = repairLogSearch.trim();
    if (!term) return;
    const match = repairLogs.find((log) => String(log.id) === term || log.repId === term);
    if (match) {
      setForm((prev) => ({ ...prev, repairLogId: String(match.id) }));
    }
  }, [repairLogSearch, repairLogs]);

  useEffect(() => {
    if (!selectedRepair || sourceMode !== "repair") return;
    setForm((prev) => {
      const baseDescription = selectedRepair.issueDescription
        ? `Repair - ${selectedRepair.issueDescription}`
        : `Repair - ${selectedRepair.deviceModel}`;
      const price = Number(selectedRepair.cost ?? 0);
      const hasCustomItems = prev.items.some((item) => item.description.trim());
      return {
        ...prev,
        customerName: selectedRepair.customer.name,
        customerEmail: selectedRepair.customer.email,
        deviceModel: selectedRepair.deviceModel,
        issueDescription: selectedRepair.issueDescription,
        repairmanName: prev.repairmanName || selectedRepair.assignedStaff?.name || prev.repairmanName,
        items: hasCustomItems ? prev.items : [{ description: baseDescription, quantity: 1, unitPrice: price }],
      };
    });
  }, [selectedRepair, sourceMode]);

  useEffect(() => {
    if (!selectedRepairLog || sourceMode !== "repair-log") return;
    setForm((prev) => {
      const device = [selectedRepairLog.brand, selectedRepairLog.model].filter(Boolean).join(" ");
      const baseDescription = selectedRepairLog.issue
        ? `Repair - ${selectedRepairLog.issue}`
        : `Repair - ${device || "Device service"}`;
      const price = Number(selectedRepairLog.cost ?? 0);
      const hasCustomItems = prev.items.some((item) => item.description.trim());
      return {
        ...prev,
        customerName: prev.customerName || selectedRepairLog.owner || "Walk-in customer",
        deviceModel: prev.deviceModel || device,
        issueDescription: prev.issueDescription || selectedRepairLog.issue || "",
        spareParts: prev.spareParts || selectedRepairLog.parts || "",
        notes: prev.notes || selectedRepairLog.comments || "",
        items: hasCustomItems ? prev.items : [{ description: baseDescription, quantity: 1, unitPrice: price }],
      };
    });
  }, [selectedRepairLog, sourceMode]);

  const setItem = (index: number, patch: Partial<BillItemInput>) => {
    setForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], ...patch };
      return { ...prev, items: next };
    });
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  const removeItem = (index: number) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const applyDiscountPreset = (percent: number) => {
    const subtotal = form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const amount = (subtotal * percent) / 100;
    setForm((prev) => ({ ...prev, discount: amount.toFixed(2) }));
  };

  const loadExisting = () => {
    if (!existingBill) return;
    setSourceMode(existingBill.repairLogId ? "repair-log" : "repair");
    setForm({
      repairId: existingBill.repairId ? String(existingBill.repairId) : "",
      repairLogId: existingBill.repairLogId ? String(existingBill.repairLogId) : "",
      customerName: existingBill.customerName ?? "",
      customerEmail: existingBill.customerEmail ?? "",
      deviceModel: existingBill.deviceModel ?? "",
      issueDescription: existingBill.issueDescription ?? "",
      repairmanName: existingBill.repairmanName ?? "",
      spareParts: existingBill.spareParts ?? "",
      discount: String(existingBill.discount ?? 0),
      taxRate: String(existingBill.taxRate ?? 0),
      amountPaid: String(existingBill.amountPaid ?? 0),
      loyaltyPoints: String(existingBill.loyaltyPoints ?? 0),
      invoiceStatus: existingBill.invoiceStatus ?? "ISSUED",
      paymentMethod: existingBill.paymentMethod ?? "CASH",
      notes: existingBill.notes ?? "",
      items: existingBill.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (sourceMode === "repair" && !form.repairId) {
      setError("Select a repair to bill.");
      return;
    }
    if (sourceMode === "repair-log" && !form.repairLogId) {
      setError("Select a repair log to bill.");
      return;
    }

    const items = form.items
      .filter((item) => item.description.trim())
      .map((item) => ({
        description: item.description.trim(),
        quantity: Math.max(1, Number(item.quantity || 1)),
        unitPrice: Number(item.unitPrice || 0),
      }));

    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        repairId: sourceMode === "repair" ? Number(form.repairId) : null,
        repairLogId: sourceMode === "repair-log" ? Number(form.repairLogId) : null,
        customerName: form.customerName || null,
        customerEmail: form.customerEmail || null,
        deviceModel: form.deviceModel || null,
        issueDescription: form.issueDescription || null,
        repairmanName: form.repairmanName || null,
        spareParts: form.spareParts || null,
        discount: Number(form.discount || 0),
        taxRate: Number(form.taxRate || 0),
        amountPaid: Number(form.amountPaid || 0),
        loyaltyPoints: Number(form.loyaltyPoints || 0),
        invoiceStatus: form.invoiceStatus || null,
        paymentMethod: form.paymentMethod || null,
        notes: form.notes || null,
        items,
      };
      const saved = await apiFetch<BillResponse>("/api/bills", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const updated = await apiFetch<BillResponse[]>("/api/bills");
      setBills(updated);
      setActiveBill(saved);
      setMessage("Bill saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const subTotal = form.items.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      return sum + qty * price;
    }, 0);
    const discount = Number(form.discount || 0);
    const taxable = Math.max(subTotal - discount, 0);
    const taxRate = Number(form.taxRate || 0);
    const taxAmount = Math.max((taxable * taxRate) / 100, 0);
    const total = taxable + taxAmount;
    const paid = Number(form.amountPaid || 0);
    const balance = Math.max(total - paid, 0);
    const paidRatio = total > 0 ? Math.min(paid / total, 1) : 0;
    return { subTotal, discount, taxRate, taxAmount, total, paid, balance, paidRatio };
  }, [form.items, form.discount, form.taxRate, form.amountPaid]);

  const activeStatusStyle = statusStyles[form.invoiceStatus] ?? statusStyles.DRAFT;

  const primaryBill = activeBill ?? existingBill;
  const printLink = primaryBill ? `${API_BASE}/api/bills/${primaryBill.id}/pdf` : null;
  const htmlLink = primaryBill ? `${API_BASE}/api/bills/${primaryBill.id}/html` : null;
  const mailTo = primaryBill && primaryBill.customerEmail
    ? `mailto:${primaryBill.customerEmail}?subject=Mobilux%20Bill%20${primaryBill.billNumber}&body=Your%20bill%20is%20ready.%20View%20here:%20${encodeURIComponent(htmlLink ?? "")}`
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin" userEmail="admin@mobilux.lk" />
      <main className="page-with-sidebar">
        <div className="page-content">
          <div className="page-header" style={{ alignItems: "center" }}>
            <div>
              <p className="label">Billing Studio</p>
              <h1 className="page-title" style={{ marginTop: "0.35rem" }}>Generate bills with confidence</h1>
              <p className="page-subtitle">Draft, issue, and finalize invoices with real-time totals and payment tracking.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              {printLink && (
                <a className="btn-secondary" href={printLink} target="_blank" rel="noreferrer" style={{ width: "auto" }}>
                  Download PDF
                </a>
              )}
              {htmlLink && (
                <a className="btn-ghost" href={htmlLink} target="_blank" rel="noreferrer" style={{ width: "auto" }}>
                  Print view
                </a>
              )}
              {mailTo && (
                <a className="btn-ghost" href={mailTo} style={{ width: "auto" }}>
                  Email client
                </a>
              )}
            </div>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1.25rem" }}>⚠ {error}</div>}
          {message && <div className="banner-success" style={{ marginBottom: "1.25rem" }}>✅ {message}</div>}

          <div className="bill-grid">
            <section className="card bill-panel">
              <div className="bill-panel-header">
                <div>
                  <p className="label">Bill source</p>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.35rem" }}>Customer + repair details</h2>
                </div>
                {existingBill && (
                  <button onClick={loadExisting} className="btn-ghost" style={{ width: "auto" }}>
                    Load existing
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: "auto", borderColor: sourceMode === "repair" ? "var(--primary)" : undefined, color: sourceMode === "repair" ? "var(--primary)" : undefined }}
                  onClick={() => switchSourceMode("repair")}
                >
                  Repair
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: "auto", borderColor: sourceMode === "repair-log" ? "var(--primary)" : undefined, color: sourceMode === "repair-log" ? "var(--primary)" : undefined }}
                  onClick={() => switchSourceMode("repair-log")}
                >
                  Repair Log
                </button>
              </div>

              {sourceMode === "repair" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <label className="label">Search repairs</label>
                  <input
                    className="input-field"
                    placeholder="Search by ID, device, or customer"
                    value={repairSearch}
                    onChange={(e) => setRepairSearch(e.target.value)}
                  />
                  <select
                    className="input-field"
                    value={form.repairId}
                    onChange={(e) => setForm((prev) => ({ ...prev, repairId: e.target.value }))}
                  >
                    <option value="">Select repair</option>
                    {filteredRepairs.map((repair) => (
                      <option key={repair.id} value={repair.id}>
                        #{repair.id} · {repair.deviceModel} · {repair.customer.name}
                      </option>
                    ))}
                  </select>
                  <Link href="/admin/repairs" className="btn-ghost" style={{ width: "auto" }}>
                    + New repair
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <label className="label">Search repair logs</label>
                  <input
                    className="input-field"
                    placeholder="Search by log ID, owner, or model"
                    value={repairLogSearch}
                    onChange={(e) => setRepairLogSearch(e.target.value)}
                  />
                  <select
                    className="input-field"
                    value={form.repairLogId}
                    onChange={(e) => setForm((prev) => ({ ...prev, repairLogId: e.target.value }))}
                  >
                    <option value="">Select repair log</option>
                    {filteredRepairLogs.map((log) => (
                      <option key={log.id} value={log.id}>
                        {log.repId} · {log.owner ?? "Walk-in"} · {[log.brand, log.model].filter(Boolean).join(" ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="divider" />

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <label className="label">Customer name</label>
                  <input
                    className="input-field"
                    value={form.customerName}
                    onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                    readOnly={sourceMode === "repair"}
                  />
                </div>
                <div>
                  <label className="label">Customer email</label>
                  <input
                    className="input-field"
                    value={form.customerEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="optional"
                    readOnly={sourceMode === "repair"}
                  />
                </div>
                <div>
                  <label className="label">Device model</label>
                  <input
                    className="input-field"
                    value={form.deviceModel}
                    onChange={(e) => setForm((prev) => ({ ...prev, deviceModel: e.target.value }))}
                    readOnly={sourceMode === "repair"}
                  />
                </div>
                <div>
                  <label className="label">Issue summary</label>
                  <input
                    className="input-field"
                    value={form.issueDescription}
                    onChange={(e) => setForm((prev) => ({ ...prev, issueDescription: e.target.value }))}
                    readOnly={sourceMode === "repair"}
                  />
                </div>
                <div>
                  <label className="label">Repairman</label>
                  <input
                    className="input-field"
                    value={form.repairmanName}
                    onChange={(e) => setForm((prev) => ({ ...prev, repairmanName: e.target.value }))}
                    placeholder={authUser?.name ?? "Repairman name"}
                  />
                </div>
              </div>
            </section>

            <section className="card bill-panel">
              <div className="bill-panel-header">
                <div>
                  <p className="label">Line items</p>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.35rem" }}>Services + parts</h2>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{form.items.length} items</span>
              </div>

              <div className="bill-items">
                {form.items.map((item, index) => (
                  <div key={`${index}-${item.description}`} className="bill-item-row">
                    <input
                      className="input-field"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => setItem(index, { description: e.target.value })}
                    />
                    <input
                      className="input-field"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => setItem(index, { quantity: Number(e.target.value) })}
                    />
                    <input
                      className="input-field"
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => removeItem(index)}
                      style={{ width: "auto" }}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-ghost" onClick={addItem} style={{ width: "auto", marginTop: "0.75rem" }}>
                + Add item
              </button>

              <div className="divider" />

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <label className="label">Spare parts summary</label>
                  <input
                    className="input-field"
                    value={form.spareParts}
                    onChange={(e) => setForm((prev) => ({ ...prev, spareParts: e.target.value }))}
                    placeholder="Screen, battery, connector"
                  />
                </div>
                <div>
                  <label className="label">Business notes</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add warranty terms, promotions, or handover notes"
                  />
                </div>
              </div>
            </section>

            <aside className="card bill-panel">
              <div className="bill-panel-header">
                <div>
                  <p className="label">Totals + payment</p>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.35rem" }}>Summary</h2>
                </div>
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.6rem",
                  borderRadius: 999,
                  background: activeStatusStyle.bg,
                  color: activeStatusStyle.color,
                  border: `1px solid ${activeStatusStyle.border}`,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                  {form.invoiceStatus}
                </span>
              </div>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <label className="label">Invoice status</label>
                  <select
                    className="input-field"
                    value={form.invoiceStatus}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoiceStatus: e.target.value }))}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ISSUED">Issued</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment method</label>
                  <select
                    className="input-field"
                    value={form.paymentMethod}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="ONLINE">Online</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="divider" />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
                <div>
                  <label className="label">Discount (LKR)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discount}
                    onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Tax rate (%)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.taxRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxRate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Paid amount (LKR)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amountPaid}
                    onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Loyalty points</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    value={form.loyaltyPoints}
                    onChange={(e) => setForm((prev) => ({ ...prev, loyaltyPoints: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                {[0, 5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className="btn-ghost"
                    style={{ width: "auto" }}
                    onClick={() => applyDiscountPreset(pct)}
                  >
                    {pct}% off
                  </button>
                ))}
              </div>

              <div className="divider" />

              <div className="bill-summary">
                <div>
                  <p className="label">Subtotal</p>
                  <p>{formatLkr(totals.subTotal)}</p>
                </div>
                <div>
                  <p className="label">Discount</p>
                  <p>- {formatLkr(totals.discount)}</p>
                </div>
                <div>
                  <p className="label">Tax</p>
                  <p>{formatLkr(totals.taxAmount)}</p>
                </div>
                <div>
                  <p className="label">Total</p>
                  <p>{formatLkr(totals.total)}</p>
                </div>
                <div>
                  <p className="label">Paid</p>
                  <p>{formatLkr(totals.paid)}</p>
                </div>
                <div>
                  <p className="label">Balance</p>
                  <p>{formatLkr(totals.balance)}</p>
                </div>
              </div>

              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span className="label">Payment progress</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{Math.round(totals.paidRatio * 100)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "var(--bg3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${totals.paidRatio * 100}%`, background: "linear-gradient(90deg, var(--primary), var(--primary-h))" }} />
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ marginTop: "1.25rem" }}>
                <button type="submit" className="btn-primary" disabled={saving} style={{ width: "100%" }}>
                  {saving ? "Saving…" : "Save bill"}
                </button>
              </form>
            </aside>
          </div>

          <section className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>All Bills</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg3)", padding: "0.25rem 0.75rem", borderRadius: 999 }}>
                {bills.length} total
              </span>
            </div>

            {loading ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>Loading…</p>
            ) : bills.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No bills generated yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {bills.map((bill) => {
                  const rowStatus = statusStyles[bill.invoiceStatus ?? "DRAFT"] ?? statusStyles.DRAFT;
                  const sourceLabel = bill.repairLogId ? "Repair Log" : "Repair";
                  return (
                    <div key={bill.id} className="table-row">
                      <div>
                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{bill.billNumber}</p>
                        <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                          {sourceLabel} · {bill.customerName}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.25rem 0.6rem",
                          borderRadius: 999,
                          background: rowStatus.bg,
                          color: rowStatus.color,
                          border: `1px solid ${rowStatus.border}`,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}>
                          {bill.invoiceStatus ?? "DRAFT"}
                        </span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary)" }}>{formatLkr(bill.total)}</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          Balance {formatLkr(bill.balance ?? 0)}
                        </span>
                        <a
                          href={`${API_BASE}/api/bills/${bill.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}
                        >
                          PDF
                        </a>
                        <a
                          href={`${API_BASE}/api/bills/${bill.id}/html`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}
                        >
                          Print
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{`
        .bill-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.35fr) minmax(0, 0.85fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .bill-panel {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .bill-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .bill-items {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .bill-item-row {
          display: grid;
          grid-template-columns: 2.1fr 0.7fr 0.9fr auto;
          gap: 0.75rem;
          align-items: center;
        }
        .bill-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .bill-summary p {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
        }
        @media (max-width: 1200px) {
          .bill-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .bill-item-row {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
