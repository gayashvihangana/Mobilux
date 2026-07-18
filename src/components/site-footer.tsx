import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Fix. Track. Trust. — Colombo, Sri Lanka
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/#services" className="transition-colors hover:text-foreground">
            Services
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/shop" className="transition-colors hover:text-foreground">
            Shop
          </Link>
          <Link href="/register" className="transition-colors hover:text-foreground">
            Start a repair
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Track my device
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Mobilux
        </p>
      </div>
    </footer>
  );
}
