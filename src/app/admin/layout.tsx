import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { AppNavLinks } from "@/components/app-nav-links";
import { Notifications } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";

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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <ShieldCheck className="size-3" /> Admin
              </span>
            </div>
            <AppNavLinks
              links={[
                { href: "/admin", label: "Overview" },
                { href: "/admin/tickets", label: "Tickets" },
                { href: "/admin/notes", label: "Notes" },
                { href: "/admin/payments", label: "Payments" },
                { href: "/admin/products", label: "Products" },
                { href: "/admin/orders", label: "Orders" },
              ]}
            />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Notifications userId={session.user.id} />
            <UserMenu
              name={session.user.name ?? "Admin"}
              email={session.user.email ?? ""}
              isAdmin
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
