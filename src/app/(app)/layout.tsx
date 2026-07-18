import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { AppNavLinks } from "@/components/app-nav-links";
import { Notifications } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-8">
            <Logo />
            <AppNavLinks
              links={[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/repairs", label: "My repairs" },
              ]}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/repairs/new">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New repair</span>
              </Link>
            </Button>
            <ThemeToggle />
            <Notifications userId={session.user.id} />
            <UserMenu
              name={session.user.name ?? "User"}
              email={session.user.email ?? ""}
              isAdmin={false}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
