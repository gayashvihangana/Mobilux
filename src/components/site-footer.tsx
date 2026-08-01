import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { SHOP } from "@/lib/config";

// The landing-page anchors only work for signed-out visitors — anyone with a
// session is redirected off "/" — so the footer swaps to their own links.
const guestLinks = [
  { href: "/#services", label: "Services" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/shop", label: "Shop" },
  { href: "/register", label: "Start a repair" },
  { href: "/track", label: "Track my device" },
];

const customerLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/repairs", label: "My repairs" },
  { href: "/shop", label: "Shop" },
  { href: "/repairs/new", label: "Start a repair" },
  { href: "/track", label: "Track my device" },
];

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tickets", label: "Repairs" },
  { href: "/shop", label: "Shop" },
  { href: "/admin/tickets/new", label: "New repair log" },
  { href: "/track", label: "Track a device" },
];

export async function SiteFooter() {
  const session = await auth();
  const user = session?.user;
  const links = user
    ? user.role === "ADMIN"
      ? adminLinks
      : customerLinks
    : guestLinks;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo
            href={user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/"}
          />
          <p className="text-sm text-muted-foreground">
            Fix. Track. Trust. — Colombo, Sri Lanka
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SHOP.name}
        </p>
      </div>
    </footer>
  );
}
