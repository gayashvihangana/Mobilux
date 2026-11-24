import type { Role } from "@prisma/client";
import Link from "next/link";
import { cookies } from "next/headers";
import { SIDEBAR_COOKIE } from "@/lib/ui-prefs";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth-guard";
import { can, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getShopInfo } from "@/lib/settings";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import type { NavIconName } from "@/components/nav-icons";
import { Notifications } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  AdminBottomBar,
  AdminFrame,
  type ShellGroup,
  type ShellLink,
} from "@/components/admin-shell";

// The admin menu, as in the approved "admin menu" sample: a navy sidebar with
// every section on a laptop, and a bottom bar (Today, Repairs, +, Payments,
// More) on a phone.
//
// `need` is presentation only. The page behind each link guards itself with
// requirePermission, and the actions behind it guard themselves again; hiding
// a link a technician can't use is tidiness, not security.
type GuardedLink = ShellLink & { need?: Permission };

const PRIMARY_LINKS: GuardedLink[] = [
  { href: "/admin", label: "Today", icon: "today" },
  { href: "/admin/tickets", label: "Repairs", icon: "repairs" },
  { href: "/admin/customers", label: "Customers", icon: "customers", need: "customer:manage" },
  { href: "/admin/payments", label: "Payments", icon: "payments", need: "payment:verify" },
];

const NAV_GROUPS: { label: string; links: GuardedLink[] }[] = [
  {
    label: "Shop",
    links: [
      { href: "/admin/orders", label: "Orders", icon: "orders", need: "order:write" },
      { href: "/admin/products", label: "Products", icon: "products", need: "product:write" },
      { href: "/admin/loyalty", label: "Loyalty", icon: "loyalty", need: "discount:write" },
      { href: "/admin/testimonials", label: "Reviews", icon: "reviews", need: "review:moderate" },
    ],
  },
  {
    label: "Numbers",
    links: [
      { href: "/admin/overview", label: "Shop numbers", icon: "overview", need: "report:read" },
      { href: "/admin/reports", label: "Reports", icon: "reports", need: "report:read" },
      { href: "/admin/errors", label: "Bench errors", icon: "errors", need: "report:read" },
      { href: "/admin/notes", label: "Notes", icon: "notes", need: "report:read" },
      { href: "/admin/activity", label: "Activity", icon: "activity", need: "audit:read" },
    ],
  },
  {
    label: "Setup",
    links: [
      { href: "/admin/staff", label: "Staff", icon: "staff", need: "staff:manage" },
      { href: "/admin/settings", label: "Settings", icon: "settings", need: "settings:write" },
    ],
  },
];

// The phone bar holds these; everything else goes under "More".
const BAR_HREFS = new Set(["/admin", "/admin/tickets", "/admin/payments"]);

const OPEN_STATUSES = [
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
] as const;

/** Drop what this account can't use, and any group left with nothing in it. */
function navFor(user: { role: Role }) {
  const allowed = (l: GuardedLink) => !l.need || can(user, l.need);
  const strip = ({ need: _need, ...link }: GuardedLink): ShellLink => link;
  return {
    primary: PRIMARY_LINKS.filter(allowed).map(strip),
    groups: NAV_GROUPS.map((g) => ({
      label: g.label,
      links: g.links.filter(allowed).map(strip),
    })).filter((g) => g.links.length > 0),
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
  const canVerify = can(user, "payment:verify");
  const [shop, openRepairs, paymentsToCheck] = await Promise.all([
    getShopInfo(),
    prisma.repairTicket.count({ where: { status: { in: [...OPEN_STATUSES] }, archivedAt: null } }),
    canVerify
      ? prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } })
      : Promise.resolve(0),
  ]);
  const brand = {
    name: shop.name,
    logoUrl: shop.logoUrl,
    logoEmoji: shop.logoEmoji,
  };

  const counts: Record<string, number> = {
    "/admin/tickets": openRepairs,
    "/admin/payments": paymentsToCheck,
  };
  const sidebarPrimary = primary.map((l) => ({ ...l, count: counts[l.href] }));

  // Phone: the bar, and "More" with Customers leading the shop group.
  const bar = primary.filter((l) => BAR_HREFS.has(l.href));
  const offBar = primary.filter((l) => !BAR_HREFS.has(l.href));
  const moreGroups: ShellGroup[] = groups.map((g, i) =>
    i === 0
      ? { label: "Customers and shop", links: [...offBar, ...g.links] }
      : g,
  );
  if (groups.length === 0 && offBar.length > 0) {
    moreGroups.push({ label: "Customers", links: offBar });
  }

  return (
    <div className="min-h-dvh">
      <AdminFrame
        initialCollapsed={(await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed"}
        sidebar={{
          brand: <Logo brand={brand} href="/admin" />,
          primary: sidebarPrimary,
          groups,
          account: (
            <>
              <UserMenu
                name={user.name}
                email={user.email}
                image={user.image ?? undefined}
                isAdmin
              />
              <span className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">
                {user.name}
              </span>
              <ThemeToggle />
              <Notifications userId={user.id} />
            </>
          ),
        }}
      >
        {/* Phone and tablet: a slim top bar; the menu is at the bottom. */}
        <header className="sticky top-0 z-30 border-b border-border bg-card lg:hidden">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-3 sm:px-4">
            <div className="min-w-0 flex-1">
              <Logo brand={brand} href="/admin" />
            </div>
            <Button asChild variant="ghost" size="icon" aria-label="Search repairs">
              <Link href="/admin/tickets#search">
                <Search />
              </Link>
            </Button>
            <ThemeToggle />
            <Notifications userId={user.id} />
            <UserMenu
              name={user.name}
              email={user.email}
              image={user.image ?? undefined}
              isAdmin
            />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:pt-8 lg:px-8 lg:pt-10 lg:pb-12">
          {children}
        </main>
      </AdminFrame>

      <AdminBottomBar bar={bar} groups={moreGroups} />
    </div>
  );
}
