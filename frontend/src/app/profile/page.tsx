"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE } from "@/lib/api";
import type { Role, UserResponse } from "@/lib/types";
import { Sidebar } from "@/app/components/Sidebar";

type SidebarRole = "admin" | "staff" | "customer";

const toSidebarRole = (role?: Role): SidebarRole => {
  if (role === "ADMIN") return "admin";
  if (role === "STAFF") return "staff";
  return "customer";
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<UserResponse>("/api/profile");
        if (!active) return;
        setProfile(data);
        setName(data.name);
        setAvatarUrl(data.avatarUrl ?? null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const role = useMemo(() => toSidebarRole(profile?.role), [profile?.role]);
  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await apiFetch<UserResponse>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name, avatarUrl }),
      });
      setProfile(updated);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const updated = await apiFetch<UserResponse>("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      setProfile(updated);
      setAvatarUrl(updated.avatarUrl ?? null);
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)" }}>
        Loading profile…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        role={role}
        userName={profile?.name}
        userEmail={profile?.email}
        avatarUrl={profile?.avatarUrl ?? null}
      />

      <main className="page-with-sidebar">
        <div className="page-content">
          <div style={{ marginBottom: "2rem" }}>
            <p className="label" style={{ marginBottom: "0.5rem" }}>Profile</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>Your account</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Update your name and profile photo.</p>
          </div>

          {error && <div className="banner-error" style={{ marginBottom: "1.5rem" }}>⚠ {error}</div>}
          {message && <div className="banner-success" style={{ marginBottom: "1.5rem" }}>✅ {message}</div>}

          <section className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl.startsWith("/") ? `${API_BASE}${avatarUrl}` : avatarUrl}
                  alt={profile?.name ?? "User"}
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div className="avatar" style={{ width: 64, height: 64, fontSize: "1.1rem" }}>{initials}</div>
              )}
              <div>
                <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{profile?.name}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{profile?.email}</p>
              </div>
            </div>

            <div>
              <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Profile photo</label>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              {uploading && <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>Uploading…</p>}
            </div>

            <form onSubmit={handleSave} style={{ display: "grid", gap: "1rem", maxWidth: 420 }}>
              <div>
                <label className="label" style={{ display: "block", marginBottom: "0.5rem" }}>Name</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="btn-primary" disabled={saving} style={{ width: "auto" }}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
