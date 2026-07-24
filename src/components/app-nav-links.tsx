"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppNavLinks({
  links,
  className,
  breakpoint = "sm",
}: {
  links: { href: string; label: string }[];
  className?: string;
  /** Viewport width at which the inline nav replaces the hamburger. Use "lg"
   * when there are many links so they don't crowd the header on tablets. */
  breakpoint?: "sm" | "lg";
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "hidden items-center gap-0.5",
        breakpoint === "lg" ? "lg:flex" : "sm:flex",
        className,
      )}
    >
      {links.map((link) => {
        const active =
          link.href === "/dashboard" || link.href === "/admin"
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
