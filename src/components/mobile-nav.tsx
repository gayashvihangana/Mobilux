"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo, type ShopBrand } from "@/components/logo";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { cn } from "@/lib/utils";

export type NavLink = {
  href: string;
  label: string;
  /** One line on what the section is for — shown under the label. */
  hint?: string;
  icon?: NavIconName;
};
export type NavGroup = { label: string; links: NavLink[] };

export function MobileNav({
  brand,
  links,
  groups,
  homeHref = "/",
  triggerClassName,
  children,
}: {
  /** Passed down from the server layout — this component can't read the DB. */
  brand: ShopBrand;
  links: NavLink[];
  /** Secondary sections, listed under headings below the main links. */
  groups?: NavGroup[];
  homeHref?: string;
  triggerClassName?: string;
  /** Extra actions rendered below the links, e.g. sign in / get started */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href.includes("#")
      ? false
      : href === "/dashboard" || href === "/admin"
        ? pathname === href
        : pathname.startsWith(href);

  // Same row shape whether or not a link carries an icon and a hint, so a nav
  // that mixes the two still lines up.
  const navLink = (link: NavLink) => {
    const active = isActive(link.href);
    return (
      <SheetClose asChild key={link.href}>
        <Link
          href={link.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
            active
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          {link.icon ? (
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md border",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/60",
              )}
            >
              <NavIcon name={link.icon} className="size-4" />
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col">
            <span className="leading-tight">{link.label}</span>
            {link.hint ? (
              <span className="mt-0.5 text-xs leading-snug font-normal text-muted-foreground">
                {link.hint}
              </span>
            ) : null}
          </span>
        </Link>
      </SheetClose>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", triggerClassName)}
        >
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 gap-0 sm:w-80">
        <SheetHeader className="border-b border-border">
          <SheetTitle asChild>
            <Logo brand={brand} href={homeHref} />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {links.map(navLink)}
          {groups?.map((group) => (
            <div key={group.label} className="mt-3 flex flex-col gap-1">
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>
              {group.links.map(navLink)}
            </div>
          ))}
        </nav>
        {children ? (
          <div className="flex flex-col gap-2 border-t border-border p-4">
            {children}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
