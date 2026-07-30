"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AdminNavLink = { href: string; label: string; hint?: string };
export type AdminNavGroup = { label: string; links: AdminNavLink[] };

// Overview and the day-to-day work stay one click away; everything else lives
// behind a single "More" menu grouped by what it's for. A flat list of a dozen
// links crowds the header and gives no clue what belongs with what.
export function AdminNav({
  primary,
  groups,
}: {
  primary: AdminNavLink[];
  groups: AdminNavGroup[];
}) {
  const pathname = usePathname();

  // /admin is only "active" on an exact match; every other section owns its
  // subtree (/admin/tickets/abc still lights up Repairs).
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  const groupedLinks = groups.flatMap((g) => g.links);
  const activeInMore = groupedLinks.find((l) => isActive(l.href));

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {primary.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            activeInMore
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          {/* Naming the active section keeps the menu honest about where you are */}
          {activeInMore ? activeInMore.label : "More"}
          <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {groups.map((group, i) => (
            <div key={group.label}>
              {i > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </DropdownMenuLabel>
              {group.links.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-0.5",
                      isActive(link.href) && "bg-accent/60 font-medium",
                    )}
                  >
                    <span>{link.label}</span>
                    {link.hint ? (
                      <span className="text-xs text-muted-foreground">
                        {link.hint}
                      </span>
                    ) : null}
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
