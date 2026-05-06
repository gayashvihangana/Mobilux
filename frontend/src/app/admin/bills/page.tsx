"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import type { AuthResponse, BillItemInput, BillResponse, RepairResponse } from "@/lib/types";
import { Sidebar } from "@/app/components/Sidebar";

const emptyItem: BillItemInput = { description: "", quantity: 1, unitPrice: 0 };

export default function AdminBillsPage() {
  const searchParams = useSearchParams();
  const [repairs, setRepairs] = useState<RepairResponse[]>([]);
  const [bills, setBills] = useState<BillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [repairSearch, setRepairSearch] = useState("");
  const [authUser, setAuthUser] = useState<AuthResponse | null>(null);

  const [form, setForm] = useState({
    repairId: "",
    repairmanName: "",
    spareParts: "",
    discount: "0",
    amountPaid: "0",
    loyaltyPoints: "0",
    notes: "",
    items: [{ ...emptyItem }],
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [repairData, billData] = await Promise.all([
          apiFetch<RepairResponse[]>("/api/repairs"),
          apiFetch<BillResponse[]>("/api/bills"),
        ]);
        if (!active) return;
        setRepairs(repairData);
        setBills(billData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load bills");
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
    if (!repairIdParam) return;
    setRepairSearch(repairIdParam);
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

  const existingBill = useMemo(() => {
    if (!selectedRepair) return null;
    return bills.find((b) => b.repairId === selectedRepair.id) ?? null;
  }, [bills, selectedRepair]);

  const filteredRepairs = useMemo(() => {
    const term = repairSearch.trim();
    if (!term) return repairs;
    return repairs.filter((repair) => String(repair.id).includes(term));
  }, [repairs, repairSearch]);

  useEffect(() => {
    const term = repairSearch.trim();
    if (!term) return;
    const match = repairs.find((repair) => String(repair.id) === term);
    if (match) {
      setForm((prev) => ({ ...prev, repairId: String(match.id) }));
    }
  }, [repairSearch, repairs]);

  useEffect(() => {
    if (!selectedRepair) return;
    setForm((prev) => {
      const nextRepairman = prev.repairmanName || selectedRepair.assignedStaff?.name || prev.repairmanName;
      const hasCustomItems = prev.items.some((item) => item.description.trim());
      if (hasCustomItems) return prev;
      const baseDescription = selectedRepair.issueDescription
        ? `Repair - ${selectedRepair.issueDescription}`
        : `Repair - ${selectedRepair.deviceModel}`;
      const price = Number(selectedRepair.cost ?? 0);
      return {
        ...prev,
        repairmanName: nextRepairman ?? prev.repairmanName,
        items: [{ description: baseDescription, quantity: 1, unitPrice: price }],
      };
    });
  }, [selectedRepair]);

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

  const loadExisting = () => {
    if (!existingBill) return;
    setForm({
      repairId: String(existingBill.repairId),
      repairmanName: existingBill.repairmanName ?? "",
      spareParts: existingBill.spareParts ?? "",
      discount: String(existingBill.discount ?? 0),
      amountPaid: String(existingBill.amountPaid ?? 0),
      loyaltyPoints: String(existingBill.loyaltyPoints ?? 0),
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

    const repairId = Number(form.repairId);
    if (!repairId) {
      setError("Select a repair to bill.");
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
        repairId,
        repairmanName: form.repairmanName || null,
        spareParts: form.spareParts || null,
        discount: Number(form.discount || 0),
        amountPaid: Number(form.amountPaid || 0),
        loyaltyPoints: Number(form.loyaltyPoints || 0),
        notes: form.notes || null,
        items,
      };
      await apiFetch<BillResponse>("/api/bills", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const updated = await apiFetch<BillResponse[]>("/api/bills");
      setBills(updated);
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
    const total = Math.max(subTotal - discount, 0);
    const paid = Number(form.amountPaid || 0);
    const balance = Math.max(total - paid, 0);
    return { subTotal, total, paid, balance };
  }, [form.items, form.discount, form.amountPaid]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar role="admin" userName="Admin" userEmail="admin@mobilux.lk" />
      <main className="page-with-sidebar">
        <div className="page-content">
          <div style={{ marginBottom: "2rem" }}>
            <p className="label" style={{ marginBottom: "0.5rem" }}>Admin Dashboard</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>Bills</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Generate and manage repair bills.</p>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1.5rem" }}>⚠ {error}</div>}
          {message && <div className="banner-success" style={{ marginBottom: "1.5rem" }}>✅ {message}</div>}

          <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>Generate Bill</h2>
              {existingBill && (
                <button onClick={loadExisting} className="btn-ghost" style={{ width: "auto" }}>
                  Load existing
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem" }}>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Repair</label>
                  <input
                    className="input-field"
                    placeholder="Search by repair ID"
                    value={repairSearch}
                    onChange={(e) => setRepairSearch(e.target.value)}
                    style={{ marginBottom: "0.5rem" }}
                  />
                  {repairSearch && filteredRepairs.length === 0 && (
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                      No repairs match that ID.
                    </div>
                  )}
                  <select
                    className="input-field"
                    value={form.repairId}
                    onChange={(e) => setForm((prev) => ({ ...prev, repairId: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const match = repairs.find((repair) => String(repair.id) === repairSearch.trim());
                      if (match) {
                        setForm((prev) => ({ ...prev, repairId: String(match.id) }));
                      }
                    }}
                  >
                    <option value="">Select repair</option>
                    {filteredRepairs.map((repair) => (
                      <option key={repair.id} value={repair.id}>
                        #{repair.id} · {repair.deviceModel} · {repair.customer.name}
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: "0.5rem" }}>
                    <a
                      href="/admin/repairs"
                      className="btn-ghost"
                      style={{ width: "auto", display: "inline-flex" }}
                    >
                      + New repair
                    </a>
                  </div>
                </div>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Repairman</label>
                  <input
                    className="input-field"
                    value={form.repairmanName}
                    onChange={(e) => setForm((prev) => ({ ...prev, repairmanName: e.target.value }))}
                    placeholder={authUser?.name ?? selectedRepair?.assignedStaff?.name ?? "Repairman name"}
                  />
                </div>
              </div>

              {selectedRepair && (
                <div className="card" style={{ padding: "1rem", background: "var(--bg3)" }}>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                    Customer: {selectedRepair.customer.name} · {selectedRepair.customer.email}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    Device: {selectedRepair.deviceModel} · Issue: {selectedRepair.issueDescription}
                  </p>
                </div>
              )}

              <div>
                <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Items</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {form.items.map((item, index) => (
                    <div key={`${index}-${item.description}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.75rem", alignItems: "center" }}>
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
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1rem" }}>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Discount (LKR)</label>
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
                  <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Paid amount (LKR)</label>
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
                  <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Loyalty points</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    value={form.loyaltyPoints}
                    onChange={(e) => setForm((prev) => ({ ...prev, loyaltyPoints: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Spare parts</label>
                  <input
                    className="input-field"
                    value={form.spareParts}
                    onChange={(e) => setForm((prev) => ({ ...prev, spareParts: e.target.value }))}
                    placeholder="Screen, battery, connector"
                  />
                </div>
              </div>

              <div className="card" style={{ padding: "1rem", background: "var(--bg3)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
                  <div>
                    <p className="label">Subtotal</p>
                    <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{formatLkr(totals.subTotal)}</p>
                  </div>
                  <div>
                    <p className="label">Total</p>
                    <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{formatLkr(totals.total)}</p>
                  </div>
                  <div>
                    <p className="label">Paid</p>
                    <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{formatLkr(totals.paid)}</p>
                  </div>
                  <div>
                    <p className="label">Balance</p>
                    <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{formatLkr(totals.balance)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Business notes / extras</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add guarantees, promotions, or business notes"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn-primary" disabled={saving} style={{ width: "auto" }}>
                  {saving ? "Saving…" : "Save bill"}
                </button>
              </div>
            </form>
          </section>

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
                {bills.map((bill) => (
                  <div key={bill.id} className="table-row">
                    <div>
                      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{bill.billNumber}</p>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        Repair #{bill.repairId} · {bill.customerName}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
                        PDF →
                      </a>
                      <a
                        href={`${API_BASE}/api/bills/${bill.id}/html`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}
                      >
                        Print →
                      </a>
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
