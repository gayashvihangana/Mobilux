"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, PanelLeft, Plus, Search } from "lucide-react";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE } from "@/lib/ui-prefs";

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



// The laptop frame: the sidebar plus the page beside it. The sidebar can be
// folded down to a strip of icons and opened again; the page slides over in
// the same smooth motion. The choice is kept in a cookie so the next page
// load starts the same way, with no jump.
export function AdminFrame({
  initialCollapsed,
  sidebar,
  children,
}: {
  initialCollapsed: boolean;
  sidebar: Omit<SidebarProps, "collapsed" | "onToggle">;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  };
  // "[" folds or opens it from the keyboard, as in most dashboards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <AdminSidebar {...sidebar} collapsed={collapsed} onToggle={toggle} />
      <div
        className={cn(
          "transition-[padding] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
          collapsed ? "lg:pl-[4.75rem]" : "lg:pl-64",
        )}
      >
        {children}
      </div>
    </>
  );
}

type SidebarProps = {
  brand: ReactNode;
  primary: ShellLink[];
  groups: ShellGroup[];
  account: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
};

const EASE = "duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none";

// Laptop (lg and up): a navy sidebar with every section in view, as in the
// approved "admin menu" sample. Folded, it keeps just the icons; hovering an
// icon shows its name. `account` is rendered by the server layout
// (notifications, theme, the user menu) and slotted in at the bottom.
function AdminSidebar({ brand, primary, groups, account, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const search = useRef<HTMLInputElement>(null);
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "group/side fixed inset-y-0 left-0 z-40 hidden flex-col overflow-x-hidden bg-ink text-ink-foreground transition-[width] lg:flex",
        EASE,
        collapsed ? "w-[4.75rem]" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2 pt-5 pb-3 transition-[padding]", EASE, collapsed ? "px-[1.25rem]" : "px-4")}>
        <div className={cn("min-w-0 flex-1 overflow-hidden transition-opacity", collapsed && "pointer-events-none w-0 flex-none opacity-0")}>
          {brand}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Open the menu" : "Fold the menu"}
          aria-expanded={!collapsed}
          title={collapsed ? "Open the menu  [" : "Fold the menu  ["}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-foreground/75 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
        >
          <PanelLeft className={cn("size-5 transition-transform", EASE, collapsed && "rotate-180")} />
        </button>
      </div>

      <div className="space-y-2.5 px-3.5">
        <Link
          href="/admin/tickets/new"
          title={collapsed ? "New repair" : undefined}
          className="flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-5 shrink-0" />
          <span className={cn("transition-opacity", collapsed ? "w-0 opacity-0" : "opacity-100")}>New repair</span>
        </Link>
        <form action="/admin/tickets" role="search" className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-foreground/60" />
          <input
            ref={search}
            type="search"
            name="q"
            placeholder="Search repairs"
            aria-label="Search repairs"
            tabIndex={collapsed ? -1 : undefined}
            className={cn(
              "h-11 w-full rounded-2xl border-0 bg-ink-foreground/10 pr-3 pl-10 text-sm text-ink-foreground outline-none placeholder:text-ink-foreground/60 focus-visible:ring-2 focus-visible:ring-ink-foreground/40",
              collapsed && "placeholder:text-transparent",
            )}
          />
          {collapsed ? (
            // Folded: the box is just an icon; a click opens the menu and
            // puts the cursor in it.
            <button
              type="button"
              aria-label="Search repairs"
              title="Search repairs"
              onClick={() => {
                onToggle();
                setTimeout(() => search.current?.focus(), 320);
              }}
              className="absolute inset-0 rounded-2xl"
            />
          ) : null}
        </form>
      </div>

      <nav
        aria-label="Admin"
        // Scrolls when the window is short, without a scrollbar on the edge.
        className="mt-3 flex-1 overflow-x-hidden overflow-y-auto px-3.5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="space-y-0.5">
          {primary.map((link) => (
            <SidebarLink key={link.href} link={link} active={isActive(pathname, link.href)} collapsed={collapsed} />
          ))}
        </ul>
        {groups.map((group) => (
          <div key={group.label}>
            <div className="relative h-10">
              <p
                className={cn(
                  "absolute inset-x-0 bottom-1.5 px-3 text-xs font-bold whitespace-nowrap text-ink-foreground/55 transition-opacity",
                  collapsed ? "opacity-0" : "opacity-100",
                )}
              >
                {group.label}
              </p>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-3 bottom-4 h-px bg-ink-foreground/15 transition-opacity",
                  collapsed ? "opacity-100" : "opacity-0",
                )}
              />
            </div>
            <ul className="space-y-0.5">
              {group.links.map((link) => (
                <SidebarLink key={link.href} link={link} active={isActive(pathname, link.href)} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div
        className={cn(
          "flex border-t border-ink-foreground/15 px-3 py-3",
          collapsed
            ? "flex-col items-center gap-1.5 [&>span]:hidden"
            : "items-center gap-1",
        )}
      >
        {account}
      </div>
    </aside>
  );
}

function SidebarLink({ link, active, collapsed }: { link: ShellLink; active: boolean; collapsed: boolean }) {
  return (
    <li className="group/link relative">
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? link.label : undefined}
        className={cn(
          "relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3.5 text-[15px] font-semibold whitespace-nowrap transition-colors",
          active
            ? "bg-ink-foreground text-ink"
            : "text-ink-foreground/80 hover:bg-ink-foreground/10 hover:text-ink-foreground",
        )}
      >
        {link.icon ? <NavIcon name={link.icon} className="size-5 shrink-0" /> : null}
        <span className={cn("truncate transition-opacity", EASE, collapsed ? "opacity-0" : "opacity-100")}>
          {link.label}
        </span>
        {link.count ? (
          collapsed ? (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-2 left-8 size-2.5 rounded-full ring-2",
                active ? "bg-primary ring-ink-foreground" : "bg-primary ring-ink",
              )}
            />
          ) : (
            <span
              className={cn(
                "ml-auto rounded-full px-2 py-0.5 text-xs font-bold",
                active ? "bg-secondary text-foreground" : "bg-ink-foreground/15",
              )}
            >
              {link.count}
            </span>
          )
        ) : null}
      </Link>
      {collapsed ? (
        // The name, shown beside the icon on hover or keyboard focus.
        <span
          role="tooltip"
          className="pointer-events-none fixed left-[5.25rem] z-50 -mt-9 rounded-lg bg-popover px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-popover-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity group-focus-within/link:opacity-100 group-hover/link:opacity-100"
        >
          {link.label}
          {link.count ? ` · ${link.count}` : ""}
        </span>
      ) : null}
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
