import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { AdminNav, type AdminNavGroup } from "@/components/admin-nav";
import { Notifications } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

// The header keeps the day-to-day work inline and files the rest under "More",
// grouped by what it's for — the flat list had grown to a dozen links.
const PRIMARY_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tickets", label: "Repairs" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/payments", label: "Payments" },
];

const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Shop",
    links: [
      { href: "/admin/products", label: "Products", hint: "Catalog & stock" },
      { href: "/admin/orders", label: "Orders", hint: "Storefront orders" },
      { href: "/admin/loyalty", label: "Loyalty", hint: "Repeat-customer discounts" },
      { href: "/admin/testimonials", label: "Reviews", hint: "Customer feedback" },
    ],
  },
  {
    label: "Insight",
    links: [
      { href: "/admin/reports", label: "Reports", hint: "Revenue & repair trends" },
      { href: "/admin/errors", label: "Bench errors", hint: "What went wrong, and its cost" },
      { href: "/admin/notes", label: "Notes", hint: "Lessons from the bench" },
    ],
  },
  {
    label: "Setup",
    links: [
      { href: "/admin/settings", label: "Settings", hint: "Shop details & bank accounts" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <MobileNav
              links={PRIMARY_LINKS}
              groups={NAV_GROUPS}
              homeHref="/admin"
              triggerClassName="-ml-2 shrink-0 md:hidden"
            />
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Logo href="/admin" />
              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary xl:inline-flex">
                <ShieldCheck className="size-3" /> Admin
              </span>
            </div>
            <AdminNav primary={PRIMARY_LINKS} groups={NAV_GROUPS} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <Notifications userId={session.user.id} />
            <UserMenu
              name={session.user.name ?? "Admin"}
              email={session.user.email ?? ""}
              image={session.user.image}
              isAdmin
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
