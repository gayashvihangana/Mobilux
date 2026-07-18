import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { AppNavLinks } from "@/components/app-nav-links";
import { Notifications } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

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
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <MobileNav
              links={[
                { href: "/admin", label: "Overview" },
                { href: "/admin/tickets", label: "Repairs" },
                { href: "/admin/reports", label: "Reports" },
                { href: "/admin/notes", label: "Notes" },
                { href: "/admin/payments", label: "Payments" },
                { href: "/admin/products", label: "Products" },
                { href: "/admin/orders", label: "Orders" },
                { href: "/admin/loyalty", label: "Loyalty" },
              ]}
              homeHref="/admin"
              triggerClassName="-ml-2 shrink-0 sm:hidden"
            />
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Logo href="/admin" />
              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary sm:inline-flex">
                <ShieldCheck className="size-3" /> Admin
              </span>
            </div>
            <AppNavLinks
              links={[
                { href: "/admin", label: "Overview" },
                { href: "/admin/tickets", label: "Repairs" },
                { href: "/admin/reports", label: "Reports" },
                { href: "/admin/notes", label: "Notes" },
                { href: "/admin/payments", label: "Payments" },
                { href: "/admin/products", label: "Products" },
                { href: "/admin/orders", label: "Orders" },
                { href: "/admin/loyalty", label: "Loyalty" },
              ]}
            />
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
