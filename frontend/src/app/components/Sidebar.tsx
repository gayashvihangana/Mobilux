"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; icon: string; href: string };

const adminNav: NavItem[] = [
  { label: "Overview",  icon: "◈", href: "/admin/dashboard" },
  { label: "Repairs",   icon: "🔧", href: "/admin/repairs"   },
  { label: "Payments",  icon: "💳", href: "/admin/payments"  },
  { label: "Products",  icon: "📦", href: "/admin/products"  },
  { label: "Users",     icon: "👥", href: "/admin/users"     },
];

const staffNav: NavItem[] = [
  { label: "Overview",  icon: "◈", href: "/staff/dashboard" },
  { label: "My Repairs",icon: "🔧", href: "/staff/repairs"   },
];

const customerNav: NavItem[] = [
  { label: "Overview",  icon: "◈", href: "/dashboard"       },
  { label: "My Repairs",icon: "🔧", href: "/dashboard/repairs"},
  { label: "Payments",  icon: "💳", href: "/dashboard/payments"},
];

type SidebarProps = {
  role?: "admin" | "staff" | "customer";
  userName?: string;
  userEmail?: string;
};

export function Sidebar({ role = "admin", userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "admin" ? adminNav : role === "staff" ? staffNav : customerNav;
  const roleLabel = role === "admin" ? "Administrator" : role === "staff" ? "Staff Member" : "Customer";
  const roleColor = role === "admin" ? "#6366f1" : role === "staff" ? "#06b6d4" : "#10b981";

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="mb-8">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 700, color: "#fff",
          }}>M</div>
          <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>Mobilux</span>
        </Link>
      </div>

      {/* Role badge */}
      <div style={{
        padding: "0.4rem 0.75rem",
        background: `${roleColor}18`,
        border: `1px solid ${roleColor}30`,
        borderRadius: 8,
        marginBottom: "1.5rem",
      }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: roleColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {roleLabel}
        </span>
      </div>

      {/* Nav label */}
      <p className="label" style={{ marginBottom: "0.5rem", paddingLeft: "0.5rem" }}>Navigation</p>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.625rem 0.75rem",
          background: "var(--bg3)",
          borderRadius: 12,
          marginBottom: "0.75rem",
        }}>
          <div style={{
            width: 34, height: 34,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.8rem", fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName ?? "User"}
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userEmail ?? ""}
            </p>
          </div>
        </div>
        <Link href="/login" className="sidebar-link" style={{ justifyContent: "center", fontSize: "0.8rem" }}>
          <span>→</span> Switch account
        </Link>
      </div>
    </aside>
  );
}
