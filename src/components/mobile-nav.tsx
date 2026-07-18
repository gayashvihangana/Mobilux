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
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string };

export function MobileNav({
  links,
  homeHref = "/",
  triggerClassName,
  children,
}: {
  links: NavLink[];
  homeHref?: string;
  triggerClassName?: string;
  /** Extra actions rendered below the links, e.g. sign in / get started */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
            <Logo href={homeHref} />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {links.map((link) => {
            const active = link.href.includes("#")
              ? false
              : link.href === "/dashboard" || link.href === "/admin"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </SheetClose>
            );
          })}
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
