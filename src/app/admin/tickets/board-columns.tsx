"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BoardColumn = {
  key: string;
  label: string;
  count: number;
  /** Column background, e.g. a soft amber for "Waiting for parts". */
  tintClass: string;
  /** Column title colour. */
  titleClass?: string;
  content: ReactNode;
};

const GAP = 12; // gap-3, between columns when they scroll on a phone

// The repair board. On a laptop the columns sit side by side. On a phone
// there is room for one, so the columns become a sideways swipe with a row
// of status tabs above it: tap a tab to jump, or swipe and the tab follows.
// Only the board scrolls sideways — the page itself never does.
export function BoardColumns({
  columns,
  initialKey,
}: {
  columns: BoardColumn[];
  initialKey?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const initialIndex = Math.max(
    0,
    columns.findIndex((c) => c.key === initialKey),
  );
  const [active, setActive] = useState(initialIndex);

  const columnWidth = () => (scroller.current?.clientWidth ?? 0) + GAP;

  // Open on the requested column (e.g. "Ready for pickup" from Today).
  useEffect(() => {
    const el = scroller.current;
    if (el && initialIndex > 0) el.scrollLeft = initialIndex * columnWidth();
    // Only on first render: later changes come from the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active tab in view in the tab row.
  useEffect(() => {
    const tab = tabs.current?.children[active] as HTMLElement | undefined;
    tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const go = (index: number) => {
    setActive(index);
    scroller.current?.scrollTo({ left: index * columnWidth(), behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <div
        ref={tabs}
        role="tablist"
        aria-label="Repair steps"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:hidden"
      >
        {columns.map((column, index) => (
          <button
            key={column.key}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => go(index)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
              index === active
                ? "bg-ink text-ink-foreground"
                : "bg-card text-foreground hover:bg-accent",
            )}
          >
            {column.label}
            <span
              className={cn(
                "grid min-w-6 place-items-center rounded-full px-1.5 text-xs",
                index === active ? "bg-ink-foreground/20" : "bg-secondary",
              )}
            >
              {column.count}
            </span>
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        onScroll={(event) => {
          const width = columnWidth();
          if (!width) return;
          const index = Math.round(event.currentTarget.scrollLeft / width);
          if (index !== active) setActive(index);
        }}
        className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible"
      >
        {columns.map((column) => (
          <section
            key={column.key}
            aria-label={column.label}
            className={cn(
              "w-full shrink-0 snap-start rounded-3xl p-3 lg:w-auto",
              column.tintClass,
            )}
          >
            <header className="mb-3 flex items-center justify-between gap-2 px-1.5 pt-1">
              <h2 className={cn("text-[15px] font-extrabold", column.titleClass)}>
                {column.label}
              </h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-card px-2 text-xs font-bold">
                {column.count}
              </span>
            </header>
            <div className="space-y-3">{column.content}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
