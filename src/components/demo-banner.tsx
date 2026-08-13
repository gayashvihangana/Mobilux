"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Site-wide — rendered once from the root layout, which is why this shows on
// both the customer site and /admin: there's a single insertion point rather
// than one per layout.
//
// This was a full-width bar above the header. It read as part of the product
// rather than a note about it, pushed every page down, and on a phone ate two
// lines of an already short viewport — on a page whose whole job is to make
// the product look good to a buyer. A corner badge says the same thing while
// leaving the layout alone.
//
// Dismissible, but only collapses to the flask icon rather than disappearing:
// a visitor who forgets this is a demo might email the fake shop, and the
// reset wipes anything they entered. State is local, so it comes back on the
// next page load — deliberately, since the warning has to survive someone
// landing deep in /admin from a shared link.
export function DemoBanner() {
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden">
      {open ? (
        <div
          className={cn(
            "flex max-w-[min(20rem,calc(100vw-2rem))] items-start gap-2.5 rounded-2xl border border-primary/30",
            "bg-primary/95 px-3.5 py-2.5 text-primary-foreground shadow-lg backdrop-blur-sm",
            "supports-[backdrop-filter]:bg-primary/85",
          )}
        >
          <FlaskConical className="mt-0.5 size-4 shrink-0" />
          <p className="text-xs leading-relaxed">
            You&apos;re viewing a <strong className="font-semibold">demo</strong>{" "}
            — nothing here is real, and it resets every night.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="-mr-1 -mt-0.5 shrink-0 rounded-lg p-1 transition-colors hover:bg-primary-foreground/15"
            aria-label="Hide the demo notice"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "grid size-10 place-items-center rounded-full border border-primary/30 bg-primary/95",
            "text-primary-foreground shadow-lg transition-transform hover:scale-105",
          )}
          aria-label="This is a demo — show details"
        >
          <FlaskConical className="size-4" />
        </button>
      )}
    </div>
  );
}
