import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";

const navLinks = [
  { href: "/#services", label: "Services" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#testimonials", label: "Reviews" },
  { href: "/shop", label: "Shop" },
  { href: "/track", label: "Track repair" },
];

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  // Logged-in users land on their dashboard, not the marketing page.
  const homeHref = user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="glass flex h-14 items-center justify-between rounded-2xl px-4 sm:px-5">
          <Logo href={homeHref} />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                    Dashboard
                  </Link>
                </Button>
                <UserMenu
                  name={user.name ?? "User"}
                  email={user.email ?? ""}
                  image={user.image}
                  isAdmin={user.role === "ADMIN"}
                />
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
            <MobileNav links={navLinks} homeHref={homeHref} triggerClassName="md:hidden">
              {user ? (
                <Button asChild variant="outline">
                  <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Sign up</Link>
                  </Button>
                </>
              )}
            </MobileNav>
          </div>
        </div>
      </div>
    </header>
  );
}
