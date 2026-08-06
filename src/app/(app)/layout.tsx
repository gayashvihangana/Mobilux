import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth-guard";
import { getShopInfo } from "@/lib/settings";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { AppNavLinks } from "@/components/app-nav-links";
import { Notifications } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Database-checked, so a blocked customer is out on their next request.
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");

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
          <div className="flex items-center gap-2 sm:gap-8">
            <MobileNav
              brand={brand}
              links={[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/repairs", label: "My repairs" },
                { href: "/orders", label: "My orders" },
                { href: "/shop", label: "Shop" },
                { href: "/feedback", label: "Feedback" },
              ]}
              homeHref="/dashboard"
              triggerClassName="-ml-2 sm:hidden"
            />
            <Logo brand={brand} href="/dashboard" />
            <AppNavLinks
              links={[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/repairs", label: "My repairs" },
                { href: "/orders", label: "My orders" },
                { href: "/shop", label: "Shop" },
                { href: "/feedback", label: "Feedback" },
              ]}
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button asChild size="sm">
              <Link href="/repairs/new">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New repair</span>
              </Link>
            </Button>
            <ThemeToggle />
            <Notifications userId={user.id} />
            <UserMenu
              name={user.name}
              email={user.email}
              image={user.image ?? undefined}
              isAdmin={false}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
