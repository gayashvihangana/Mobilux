"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AuthResponse, Role } from "@/lib/types";

const redirectByRole: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  CUSTOMER: "/dashboard",
  STAFF: "/staff/dashboard",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(redirectByRole[response.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-4xl gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8">
            <Link href="/" className="font-display text-2xl text-shadow-glow">
              Mobilux
            </Link>
            <h1 className="mt-6 font-display text-3xl text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to manage repairs, track progress, and confirm payments.
            </p>
            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <p className="mt-6 text-sm text-slate-400">
              New to Mobilux?{" "}
              <Link href="/signup" className="text-amber-200 hover:text-amber-100">
                Create an account
              </Link>
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Demo access</p>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div>
                <p className="text-white">Admin</p>
                <p>admin@mobilux.lk / Admin@123</p>
              </div>
              <div>
                <p className="text-white">Staff</p>
                <p>staff@mobilux.lk / password</p>
              </div>
              <div>
                <p className="text-white">Customer</p>
                <p>customer@mobilux.lk / password</p>
              </div>
            </div>
            <div className="mt-10 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-400">
              <p>
                Tips: Start with the admin dashboard to manage repairs, then switch to staff or customer views.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
