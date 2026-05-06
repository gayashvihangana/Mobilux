"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, API_BASE } from "@/lib/api";

type NavItem = { label: string; icon: string; href: string; badge?: number };

const adminNav: NavItem[] = [
  { label: "Overview",  icon: "⊞", href: "/admin/dashboard" },
  { label: "Repairs",   icon: "🔧", href: "/admin/repairs",  badge: 3 },
  { label: "Bills",     icon: "🧾", href: "/admin/bills" },
  { label: "Payments",  icon: "💳", href: "/admin/payments" },
  { label: "Products",  icon: "📦", href: "/admin/products" },
  { label: "Users",     icon: "👥", href: "/admin/users" },
];

const staffNav: NavItem[] = [
  { label: "Overview",   icon: "⊞", href: "/staff/dashboard" },
  { label: "My Repairs", icon: "🔧", href: "/staff/repairs" },
];

const customerNav: NavItem[] = [
  { label: "Overview",   icon: "⊞", href: "/dashboard" },
  { label: "My Repairs", icon: "🔧", href: "/dashboard/repairs" },
  { label: "Payments",   icon: "💳", href: "/dashboard/payments" },
];

const roleConfig = {
  admin:    { label: "Administrator", color: "#4f46e5", bg: "rgba(79,70,229,0.08)" },
  staff:    { label: "Staff Member",  color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
  customer: { label: "Customer",      color: "#10b981", bg: "rgba(16,185,129,0.08)" },
};

type SidebarProps = {
  role?: "admin" | "staff" | "customer";
  userName?: string;
  userEmail?: string;
  avatarUrl?: string | null;
};

export function Sidebar({ role = "admin", userName, userEmail, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = role === "admin" ? adminNav : role === "staff" ? staffNav : customerNav;
  const { label: roleLabel, color: roleColor, bg: roleBg } = roleConfig[role];

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";
  const avatarSrc = avatarUrl
    ? avatarUrl.startsWith("/")
      ? `${API_BASE}${avatarUrl}`
      : avatarUrl
    : null;

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}
        >
          <div style={{
            width: 34, height: 34,
            background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.9rem", fontWeight: 800, color: "#fff",
            boxShadow: "0 2px 8px rgba(79,70,229,0.35)",
            flexShrink: 0,
          }}>M</div>
          <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Mobilux
          </span>
        </Link>
      </div>

      {/* Role badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        padding: "0.5rem 0.75rem",
        background: roleBg,
        border: `1px solid ${roleColor}22`,
        borderRadius: "var(--r-md)",
        marginBottom: "1.5rem",
      }}>
        <div style={{
          width: 6, height: 6,
          borderRadius: "50%",
          background: roleColor,
          boxShadow: `0 0 6px ${roleColor}`,
          flexShrink: 0,
          animation: "pulseSlow 2s ease-in-out infinite",
        }} />
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: roleColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {roleLabel}
        </span>
      </div>

      {/* Main Nav */}
      <p className="sidebar-section-label">Menu</p>
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* General section */}
      <div>
        <p className="sidebar-section-label">General</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <Link href="/profile" className="sidebar-link" style={{ fontSize: "0.82rem" }}>
            <span className="sidebar-icon">👤</span>
            <span>Profile</span>
          </Link>
          <Link href="/login" className="sidebar-link" style={{ fontSize: "0.82rem" }}>
            <span className="sidebar-icon">❓</span>
            <span>Help</span>
          </Link>
          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{ fontSize: "0.82rem", textAlign: "left", background: "none", border: "none", width: "100%" }}
          >
            <span className="sidebar-icon">→</span>
            <span>Logout</span>
          </button>
        </div>

        {/* User card */}
        <Link href="/profile" style={{ textDecoration: "none" }}>
          <div style={{
          display: "flex", alignItems: "center", gap: "0.625rem",
          padding: "0.75rem",
          background: "var(--bg3)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          marginTop: "1rem",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={userName ?? "User"}
              width={32}
              height={32}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div className="avatar" style={{ width: 32, height: 32, fontSize: "0.75rem" }}>{initials}</div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName ?? "User"}
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userEmail ?? ""}
            </p>
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--dim)", flexShrink: 0 }}>⋮</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
