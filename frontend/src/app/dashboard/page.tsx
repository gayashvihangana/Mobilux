"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatLkr } from "@/lib/format";
import type {
  CustomerDashboardResponse,
  RepairResponse,
  UserResponse,
} from "@/lib/types";
import { StatusBadge } from "@/app/components/StatusBadge";

const fallbackProfile: UserResponse = {
  id: 3,
  name: "Customer One",
  email: "customer@mobilux.lk",
  role: "CUSTOMER",
};

const fallbackRepairs: RepairResponse[] = [
  {
    id: 12,
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
    deviceModel: "iPhone 12 Pro",
    issueDescription: "Screen replacement and diagnostics",
    status: "IN_PROGRESS",
    cost: 22000,
    createdAt: "2025-05-01T10:12:00Z",
    updatedAt: "2025-05-02T09:30:00Z",
    completedAt: null,
  },
  {
    id: 13,
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
    deviceModel: "Samsung Galaxy A52",
    issueDescription: "Battery replacement",
    status: "COMPLETED",
    cost: 9500,
    createdAt: "2025-04-20T08:00:00Z",
    updatedAt: "2025-04-21T12:20:00Z",
    completedAt: "2025-04-21T12:20:00Z",
  },
];

const fallbackDashboard: CustomerDashboardResponse = {
  activeRepairs: fallbackRepairs.filter((repair) => repair.status !== "COMPLETED"),
  repairHistory: fallbackRepairs.filter((repair) => repair.status === "COMPLETED"),
  discount: {
    id: 1,
    percentage: 10,
    eligibilityRules: "Eligible after 3 completed repairs",
    active: true,
    createdAt: "2025-04-21T12:20:00Z",
  },
};

export default function CustomerDashboard() {
  const [dashboard, setDashboard] = useState<CustomerDashboardResponse | null>(null);
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashboardResponse, profileResponse] = await Promise.all([
          apiFetch<CustomerDashboardResponse>("/api/dashboard/customer"),
          apiFetch<UserResponse>("/api/profile"),
        ]);
        if (!active) {
          return;
        }
        setDashboard(dashboardResponse);
        setProfile(profileResponse);
        setProfileName(profileResponse.name);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
        setDashboard(fallbackDashboard);
        setProfile(fallbackProfile);
        setProfileName(fallbackProfile.name);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    try {
      const updated = await apiFetch<UserResponse>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name: profileName }),
      });
      setProfile(updated);
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const handleReceiptUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReceiptMessage(null);
    if (!receiptPaymentId || !receiptFile) {
      setReceiptMessage("Payment ID and receipt file are required.");
      return;
    }

    setReceiptUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", receiptFile);
      await apiFetch(`/api/payments/${receiptPaymentId}/receipt`, {
        method: "POST",
        body: formData,
      });
      setReceiptMessage("Receipt uploaded. Awaiting verification.");
      setReceiptPaymentId("");
      setReceiptFile(null);
    } catch (err) {
      setReceiptMessage(err instanceof Error ? err.message : "Failed to upload receipt");
    } finally {
      setReceiptUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 px-6 py-10 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Loading dashboard</p>
            <p className="mt-4 text-slate-400">Fetching repairs, discounts, and profile data.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeRepairs = dashboard?.activeRepairs ?? [];
  const repairHistory = dashboard?.repairHistory ?? [];

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
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Customer dashboard</p>
            <h1 className="mt-3 font-display text-3xl text-white md:text-4xl">
              Welcome back{profile ? `, ${profile.name}` : ""}
            </h1>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            {dashboard?.discount.active
              ? `${dashboard.discount.percentage}% discount active`
              : "Discount locked"}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}. Showing sample data.
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Active repairs</h2>
                <span className="text-sm text-slate-400">{activeRepairs.length} active</span>
              </div>
              <div className="mt-6 space-y-4">
                {activeRepairs.length === 0 ? (
                  <p className="text-sm text-slate-400">No active repairs right now.</p>
                ) : (
                  activeRepairs.map((repair) => (
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
                        <span>Cost: {formatLkr(repair.cost)}</span>
                        <span>Updated: {new Date(repair.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Repair history</h2>
                <span className="text-sm text-slate-400">{repairHistory.length} completed</span>
              </div>
              <div className="mt-6 space-y-4">
                {repairHistory.length === 0 ? (
                  <p className="text-sm text-slate-400">No completed repairs yet.</p>
                ) : (
                  repairHistory.map((repair) => (
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
                        <span>Total: {formatLkr(repair.cost)}</span>
                        <span>Completed: {repair.completedAt ? new Date(repair.completedAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">Discount eligibility</h2>
              <p className="mt-2 text-sm text-slate-400">
                {dashboard?.discount.eligibilityRules ?? "Complete 3 repairs to unlock discounts."}
              </p>
              <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Current discount</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {dashboard?.discount.active ? `${dashboard.discount.percentage}%` : "0%"}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">Profile management</h2>
              <p className="mt-2 text-sm text-slate-400">Update your display name.</p>
              {profileMessage ? (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  {profileMessage}
                </div>
              ) : null}
              <form className="mt-4 space-y-3" onSubmit={handleProfileUpdate}>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Full name"
                  required
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-500"
                >
                  Save profile
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">Upload payment receipt</h2>
              <p className="mt-2 text-sm text-slate-400">
                Provide the payment ID and upload your bank transfer receipt.
              </p>
              {receiptMessage ? (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  {receiptMessage}
                </div>
              ) : null}
              <form className="mt-4 space-y-3" onSubmit={handleReceiptUpload}>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  placeholder="Payment ID"
                  value={receiptPaymentId}
                  onChange={(event) => setReceiptPaymentId(event.target.value)}
                  required
                />
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                  required
                />
                <button
                  type="submit"
                  disabled={receiptUploading}
                  className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {receiptUploading ? "Uploading..." : "Upload receipt"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
