"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import type { RepairResponse, RepairStatus, StaffDashboardResponse } from "@/lib/types";
import { StatusBadge } from "@/app/components/StatusBadge";

const statusOptions: RepairStatus[] = ["PENDING", "IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED"];

const fallbackRepairs: RepairResponse[] = [
  {
    id: 44,
    customer: {
      id: 7,
      name: "Kavindu A.",
      email: "kavindu@mobilux.lk",
      role: "CUSTOMER",
    },
    assignedStaff: {
      id: 2,
      name: "Repair Staff",
      email: "staff@mobilux.lk",
      role: "STAFF",
    },
    deviceModel: "iPhone 11",
    issueDescription: "Speaker replacement",
    status: "IN_PROGRESS",
    cost: 7800,
    createdAt: "2025-05-01T11:00:00Z",
    updatedAt: "2025-05-02T09:10:00Z",
    completedAt: null,
  },
  {
    id: 45,
    customer: {
      id: 8,
      name: "Rashmi L.",
      email: "rashmi@mobilux.lk",
      role: "CUSTOMER",
    },
    assignedStaff: {
      id: 2,
      name: "Repair Staff",
      email: "staff@mobilux.lk",
      role: "STAFF",
    },
    deviceModel: "Samsung Galaxy A32",
    issueDescription: "Charging port cleaning",
    status: "READY_FOR_PICKUP",
    cost: 4200,
    createdAt: "2025-05-01T08:30:00Z",
    updatedAt: "2025-05-02T13:45:00Z",
    completedAt: null,
  },
];

export default function StaffDashboardPage() {
  const [repairs, setRepairs] = useState<RepairResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, RepairStatus>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const response = await apiFetch<StaffDashboardResponse>("/api/dashboard/staff");
        if (!active) {
          return;
        }
        setRepairs(response.assignedRepairs);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load repairs");
        setRepairs(fallbackRepairs);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleStatusChange = (repairId: number, status: RepairStatus) => {
    setStatusMap((prev) => ({ ...prev, [repairId]: status }));
  };

  const handleUpdate = async (repairId: number) => {
    const status = statusMap[repairId];
    if (!status) {
      setMessage("Select a status to update.");
      return;
    }

    setUpdatingId(repairId);
    setMessage(null);
    try {
      const updated = await apiFetch<RepairResponse>(`/api/repairs/${repairId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setRepairs((prev) => prev.map((repair) => (repair.id === updated.id ? updated : repair)));
      setMessage("Repair status updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update repair");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-2xl text-shadow-glow">
            Mobilux
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm transition hover:border-slate-500"
          >
            Switch account
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Staff dashboard</p>
            <h1 className="mt-3 font-display text-3xl text-white md:text-4xl">Assigned repairs</h1>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            {repairs.length} repairs in your queue
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}. Showing sample data.
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
            {message}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          {repairs.length === 0 ? (
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 text-sm text-slate-400">
              No assigned repairs yet.
            </div>
          ) : (
            repairs.map((repair) => (
              <div
                key={repair.id}
                className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{repair.deviceModel}</p>
                    <p className="text-lg text-white">{repair.issueDescription}</p>
                    <p className="mt-1 text-sm text-slate-500">Customer: {repair.customer.name}</p>
                  </div>
                  <StatusBadge status={repair.status} />
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
                  <span>Cost: {formatLkr(repair.cost)}</span>
                  <span>Updated: {new Date(repair.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <select
                    className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-white"
                    value={statusMap[repair.id] ?? repair.status}
                    onChange={(event) => handleStatusChange(repair.id, event.target.value as RepairStatus)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-2xl border border-amber-400/60 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-300"
                    onClick={() => handleUpdate(repair.id)}
                    disabled={updatingId === repair.id}
                  >
                    {updatingId === repair.id ? "Updating..." : "Update status"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
