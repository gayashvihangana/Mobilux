"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import type { AdminDashboardResponse, PaymentResponse, RepairResponse } from "@/lib/types";
import { StatusBadge } from "@/app/components/StatusBadge";
import { StatCard } from "@/app/components/StatCard";

const fallbackSummary: AdminDashboardResponse = {
  totalRepairs: 86,
  pendingPayments: 7,
  activeRepairs: 14,
  totalRevenue: 462000,
};

const fallbackRepairs: RepairResponse[] = [
  {
    id: 32,
    customer: {
      id: 3,
      name: "Customer One",
      email: "customer@mobilux.lk",
      role: "CUSTOMER",
    },
    assignedStaff: {
      id: 2,
      name: "Repair Staff",
      email: "staff@mobilux.lk",
      role: "STAFF",
    },
    deviceModel: "iPhone 13",
    issueDescription: "Camera replacement",
    status: "IN_PROGRESS",
    cost: 28500,
    createdAt: "2025-05-02T08:00:00Z",
    updatedAt: "2025-05-02T12:30:00Z",
    completedAt: null,
  },
  {
    id: 33,
    customer: {
      id: 4,
      name: "Customer Two",
      email: "customer2@mobilux.lk",
      role: "CUSTOMER",
    },
    assignedStaff: {
      id: 2,
      name: "Repair Staff",
      email: "staff@mobilux.lk",
      role: "STAFF",
    },
    deviceModel: "Samsung Galaxy S22",
    issueDescription: "Charging port repair",
    status: "PENDING",
    cost: 14500,
    createdAt: "2025-05-01T10:00:00Z",
    updatedAt: "2025-05-01T10:00:00Z",
    completedAt: null,
  },
];

const fallbackPayments: PaymentResponse[] = [
  {
    id: 4,
    repairId: 31,
    amount: 18000,
    receiptUrl: "/uploads/receipts/sample-receipt.jpg",
    status: "PENDING",
    createdAt: "2025-05-01T14:00:00Z",
    updatedAt: "2025-05-01T14:00:00Z",
  },
  {
    id: 5,
    repairId: 30,
    amount: 9500,
    receiptUrl: "/uploads/receipts/sample-receipt.jpg",
    status: "VERIFIED",
    createdAt: "2025-04-30T09:00:00Z",
    updatedAt: "2025-04-30T12:00:00Z",
  },
];

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardResponse | null>(null);
  const [repairs, setRepairs] = useState<RepairResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [summaryResponse, repairsResponse, paymentsResponse] = await Promise.all([
          apiFetch<AdminDashboardResponse>("/api/dashboard/admin"),
          apiFetch<RepairResponse[]>("/api/repairs"),
          apiFetch<PaymentResponse[]>("/api/payments"),
        ]);
        if (!active) {
          return;
        }
        setSummary(summaryResponse);
        setRepairs(repairsResponse.slice(0, 5));
        setPayments(paymentsResponse.slice(0, 5));
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
        setSummary(fallbackSummary);
        setRepairs(fallbackRepairs);
        setPayments(fallbackPayments);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-2xl text-shadow-glow">
            Mobilux
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-amber-400/60 px-4 py-2 text-sm text-amber-100"
            >
              Admin panel
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm transition hover:border-slate-500"
            >
              Switch account
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Admin dashboard</p>
            <h1 className="mt-3 font-display text-3xl text-white md:text-4xl">Overview</h1>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            Payments and repair operations
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}. Showing sample data.
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total repairs" value={`${summary?.totalRepairs ?? 0}`} />
          <StatCard label="Active repairs" value={`${summary?.activeRepairs ?? 0}`} />
          <StatCard label="Pending payments" value={`${summary?.pendingPayments ?? 0}`} />
          <StatCard label="Total revenue" value={formatLkr(summary?.totalRevenue ?? 0)} />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent repairs</h2>
              <span className="text-sm text-slate-400">{repairs.length} items</span>
            </div>
            <div className="mt-6 space-y-4">
              {repairs.map((repair) => (
                <div
                  key={repair.id}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">{repair.deviceModel}</p>
                      <p className="text-base text-white">{repair.issueDescription}</p>
                    </div>
                    <StatusBadge status={repair.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                    <span>{repair.customer.name}</span>
                    <span>{formatLkr(repair.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Payments</h2>
              <span className="text-sm text-slate-400">{payments.length} latest</span>
            </div>
            <div className="mt-6 space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Payment {payment.id}</p>
                      <p className="mt-2 text-sm text-white">Repair {payment.repairId}</p>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatLkr(payment.amount)}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Status: {payment.status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Management quick actions</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "Create and update repairs",
              "Manage staff and customer accounts",
              "Toggle product visibility",
              "Verify bank transfer receipts",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
