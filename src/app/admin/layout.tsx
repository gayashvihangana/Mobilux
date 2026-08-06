import type { Role } from "@prisma/client";
import { ShieldCheck, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/auth-guard";
import { can, type Permission } from "@/lib/permissions";
import { getShopInfo } from "@/lib/settings";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { AdminNav, type AdminNavGroup } from "@/components/admin-nav";
import { Notifications } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

// The header keeps the day-to-day work inline and files the rest under "More",
// grouped by what it's for — the flat list had grown to a dozen links.
//
// `need` is presentation only. The page behind each link guards itself with
// requirePermission, and the actions behind it guard themselves again; hiding
// a link a technician can't use is tidiness, not security.
type GuardedLink = { href: string; label: string; hint?: string; need?: Permission };

const PRIMARY_LINKS: GuardedLink[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tickets", label: "Repairs" },
  { href: "/admin/customers", label: "Customers", need: "customer:manage" },
  { href: "/admin/payments", label: "Payments", need: "payment:verify" },
];

const NAV_GROUPS: (Omit<AdminNavGroup, "links"> & { links: GuardedLink[] })[] = [
  {
    label: "Shop",
    links: [
      { href: "/admin/products", label: "Products", hint: "Catalog & stock", need: "product:write" },
      { href: "/admin/orders", label: "Orders", hint: "Storefront orders", need: "order:write" },
      { href: "/admin/loyalty", label: "Loyalty", hint: "Repeat-customer discounts", need: "discount:write" },
      { href: "/admin/testimonials", label: "Reviews", hint: "Customer feedback", need: "review:moderate" },
    ],
  },
  {
    label: "Insight",
    links: [
      { href: "/admin/reports", label: "Reports", hint: "Revenue & repair trends", need: "report:read" },
      { href: "/admin/errors", label: "Bench errors", hint: "What went wrong, and its cost", need: "report:read" },
      { href: "/admin/notes", label: "Notes", hint: "Lessons from the bench", need: "report:read" },
      { href: "/admin/activity", label: "Activity", hint: "Who did what", need: "audit:read" },
    ],
  },
  {
    label: "Setup",
    links: [
      { href: "/admin/staff", label: "Staff", hint: "Technician accounts", need: "staff:manage" },
      { href: "/admin/settings", label: "Settings", hint: "Shop details & bank accounts", need: "settings:write" },
    ],
  },
];

/** Drop what this account can't use, and any group left with nothing in it. */
function navFor(user: { role: Role }) {
  const allowed = (l: GuardedLink) => !l.need || can(user, l.need);
  return {
    primary: PRIMARY_LINKS.filter(allowed).map(({ href, label }) => ({ href, label })),
    groups: NAV_GROUPS.map((g) => ({ ...g, links: g.links.filter(allowed) })).filter(
      (g) => g.links.length > 0,
    ) as AdminNavGroup[],
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Re-checked against the database, not just the JWT — a demoted, deactivated
  // or blocked account loses the panel on its next request, not in eight hours.
  // This only decides "does this person belong in the back office at all";
  // each page inside guards its own permission.
  const user = await requireStaff();
  const { primary, groups } = navFor(user);
  const isAdmin = user.role === "ADMIN";
  const shop = await getShopInfo();
  const brand = {
    name: shop.name,
    logoUrl: shop.logoUrl,
    logoEmoji: shop.logoEmoji,
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <MobileNav
              brand={brand}
              links={primary}
              groups={groups}
              homeHref="/admin"
              triggerClassName="-ml-2 shrink-0 md:hidden"
            />
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Logo brand={brand} href="/admin" />
              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary xl:inline-flex">
                {isAdmin ? (
                  <>
                    <ShieldCheck className="size-3" /> Admin
                  </>
                ) : (
                  <>
                    <Wrench className="size-3" /> Staff
                  </>
                )}
              </span>
            </div>
            <AdminNav primary={primary} groups={groups} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <Notifications userId={user.id} />
            <UserMenu
              name={user.name}
              email={user.email}
              image={user.image ?? undefined}
              isAdmin
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
