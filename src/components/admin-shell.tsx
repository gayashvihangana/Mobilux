"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, Search } from "lucide-react";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ShellLink = {
  href: string;
  label: string;
  icon?: NavIconName;
  /** A small number beside the link, e.g. open repairs. */
  count?: number;
};
export type ShellGroup = { label: string; links: ShellLink[] };

/** Today is only "/admin" itself; every other link owns its sub-pages. */
function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Laptop (lg and up): a navy sidebar with every section in view, as in the
// approved "admin menu" sample. `account` is rendered by the server layout
// (notifications, theme, the user menu) and slotted in at the bottom.
export function AdminSidebar({
  brand,
  primary,
  groups,
  account,
}: {
  brand: ReactNode;
  primary: ShellLink[];
  groups: ShellGroup[];
  account: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink text-ink-foreground lg:flex">
      <div className="px-4 pt-5 pb-3">{brand}</div>
      <div className="space-y-2.5 px-3.5">
        <Link
          href="/admin/tickets/new"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-5" /> New repair
        </Link>
        <form action="/admin/tickets" role="search" className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-foreground/60" />
          <input
            type="search"
            name="q"
            placeholder="Search repairs"
            aria-label="Search repairs"
            className="h-11 w-full rounded-2xl border-0 bg-ink-foreground/10 pr-3 pl-10 text-sm text-ink-foreground outline-none placeholder:text-ink-foreground/60 focus-visible:ring-2 focus-visible:ring-ink-foreground/40"
          />
        </form>
      </div>
      <nav aria-label="Admin" className="mt-3 flex-1 overflow-y-auto px-3.5 pb-4">
        <ul className="space-y-0.5">
          {primary.map((link) => (
            <SidebarLink key={link.href} link={link} active={isActive(pathname, link.href)} />
          ))}
        </ul>
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pt-5 pb-1.5 text-xs font-bold text-ink-foreground/55">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.links.map((link) => (
                <SidebarLink key={link.href} link={link} active={isActive(pathname, link.href)} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-1 border-t border-ink-foreground/15 px-3 py-3">
        {account}
      </div>
    </aside>
  );
}

function SidebarLink({ link, active }: { link: ShellLink; active: boolean }) {
  return (
    <li>
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
          active
            ? "bg-ink-foreground text-ink"
            : "text-ink-foreground/80 hover:bg-ink-foreground/10 hover:text-ink-foreground",
        )}
      >
        {link.icon ? <NavIcon name={link.icon} className="size-5 shrink-0" /> : null}
        <span className="truncate">{link.label}</span>
        {link.count ? (
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-xs font-bold",
              active ? "bg-secondary text-foreground" : "bg-ink-foreground/15",
            )}
          >
            {link.count}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

// Phone and tablet (below lg): a bar at the bottom with Today, Repairs, a big
// + for a new repair, Payments and More. "More" opens a panel with every
// other section, grouped.
export function AdminBottomBar({
  bar,
  groups,
}: {
  /** Up to four links; the + sits in the middle. */
  bar: ShellLink[];
  groups: ShellGroup[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const half = Math.ceil(bar.length / 2);
  const moreActive =
    !bar.some((l) => isActive(pathname, l.href)) &&
    groups.some((g) => g.links.some((l) => isActive(pathname, l.href)));

  return (
    <>
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex h-[4.75rem] max-w-lg items-center px-1.5">
          {bar.slice(0, half).map((link) => (
            <BarLink key={link.href} link={link} active={isActive(pathname, link.href)} />
          ))}
          <li className="flex flex-1 justify-center">
            <Link
              href="/admin/tickets/new"
              className="-mt-5 flex flex-col items-center gap-1 text-[11.5px] font-bold text-muted-foreground"
            >
              <span className="grid size-13 place-items-center rounded-[18px] bg-primary text-primary-foreground">
                <Plus className="size-6" />
              </span>
              New
            </Link>
          </li>
          {bar.slice(half).map((link) => (
            <BarLink key={link.href} link={link} active={isActive(pathname, link.href)} />
          ))}
          {groups.length > 0 ? (
            <li className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                className={cn(
                  "flex h-15 w-full flex-col items-center justify-center gap-1 text-[11.5px] font-bold",
                  moreActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <LayoutGrid className="size-5" />
                More
              </button>
            </li>
          ) : null}
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-[28px] border-0 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">More sections</SheetTitle>
          </SheetHeader>
          <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-border" aria-hidden />
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="px-1 pt-3 pb-2 text-[13px] font-bold text-muted-foreground">
                {group.label}
              </h2>
              <ul className="grid grid-cols-3 gap-2">
                {group.links.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-[13px] leading-tight font-bold",
                          active ? "bg-primary text-primary-foreground" : "bg-secondary",
                        )}
                      >
                        {link.icon ? (
                          <NavIcon
                            name={link.icon}
                            className={cn("size-5", !active && "text-primary")}
                          />
                        ) : null}
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </SheetContent>
      </Sheet>
    </>
  );
}

function BarLink({ link, active }: { link: ShellLink; active: boolean }) {
  return (
    <li className="flex flex-1 justify-center">
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-15 w-full flex-col items-center justify-center gap-1 text-[11.5px] font-bold",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {link.icon ? <NavIcon name={link.icon} className="size-5" /> : null}
        {link.label}
      </Link>
    </li>
  );
}
