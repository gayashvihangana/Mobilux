"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { cn } from "@/lib/utils";

export type AdminNavLink = {
  href: string;
  label: string;
  hint?: string;
  icon?: NavIconName;
};
export type AdminNavGroup = { label: string; links: AdminNavLink[] };

// One column per group, so the panel is a map of the back office rather than a
// single tall list. A stack of ten labels with a line of small print under each
// reads as one grey block; side-by-side columns with headings and icons let
// someone who has never seen the panel find "Products" without reading it all.
const PANEL_WIDTH = ["w-72", "w-72", "w-[34rem]", "w-[46rem]"];

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
  const columns = Math.min(groups.length, 3);

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
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className={cn(
            "max-w-[calc(100vw-1.5rem)] p-0",
            PANEL_WIDTH[columns] ?? PANEL_WIDTH[3],
          )}
        >
          <div
            className={cn(
              "grid gap-y-4 p-2.5",
              columns === 3 && "grid-cols-3",
              columns === 2 && "grid-cols-2",
            )}
          >
            {groups.map((group, i) => (
              <div
                key={group.label}
                className={cn(i > 0 && columns > 1 && "border-l border-border pl-2.5")}
              >
                <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </p>
                {group.links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group/item flex cursor-pointer items-start gap-2.5 rounded-lg p-2",
                          active && "bg-accent",
                        )}
                      >
                        {link.icon ? (
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                              active
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-muted/60 text-muted-foreground group-focus/item:text-foreground",
                            )}
                          >
                            <NavIcon name={link.icon} className="size-4" />
                          </span>
                        ) : null}
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span
                            className={cn(
                              "text-sm leading-tight text-foreground",
                              active && "font-medium",
                            )}
                          >
                            {link.label}
                          </span>
                          {link.hint ? (
                            <span className="text-xs leading-snug text-balance text-muted-foreground">
                              {link.hint}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
