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
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string };
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

  const linkClass = (href: string) => {
    const active = href.includes("#")
      ? false
      : href === "/dashboard" || href === "/admin"
        ? pathname === href
        : pathname.startsWith(href);
    return cn(
      "rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors",
      active
        ? "bg-accent text-foreground"
        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
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
          {links.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link href={link.href} className={linkClass(link.href)}>
                {link.label}
              </Link>
            </SheetClose>
          ))}
          {groups?.map((group) => (
            <div key={group.label} className="mt-3 flex flex-col gap-1">
              <p className="px-3.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>
              {group.links.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link href={link.href} className={linkClass(link.href)}>
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
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
