"use client";

import Link from "next/link";
import { Check, ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type MenuOption = {
  value: string;
  label: string;
  /** Small grey line under the label — what the option actually does. */
  hint?: string;
  /** Shown on the right, e.g. how many rows match. */
  count?: number;
  /** Tints the row, for options that carry a warning (unpaid, errors…). */
  tone?: "warning" | "success" | "destructive";
};

export type MenuGroup = {
  /** Query-string key this group writes to. */
  param: string;
  label: string;
  options: MenuOption[];
  /** The value that means "no filter" — it's removed from the URL. */
  defaultValue: string;
  /** Current value, resolved by the page. */
  value: string;
};

// A funnel drawn as a solid wedge over three tapering bars — reads as
// "filter" at 16px far better than a hairline outline does.
function FilterGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4.5 5.2A1.2 1.2 0 0 1 5.6 4.5h12.8a1.2 1.2 0 0 1 .93 1.96l-4.72 5.74a2 2 0 0 0-.46 1.27v4.3a1.2 1.2 0 0 1-.66 1.07l-2.4 1.2a1.2 1.2 0 0 1-1.74-1.07v-5.5a2 2 0 0 0-.46-1.27L4.17 6.46a1.2 1.2 0 0 1-.27-.76Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path
        d="M5.6 4.5h12.8a1.2 1.2 0 0 1 .93 1.96l-4.72 5.74a2 2 0 0 0-.46 1.27v4.3a1.2 1.2 0 0 1-.66 1.07l-2.4 1.2a1.2 1.2 0 0 1-1.74-1.07v-6.5a2 2 0 0 0-.46-1.27L4.17 6.46A1.2 1.2 0 0 1 5.6 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Two arrows over stacked rules — the usual "sort" idiom, drawn to match the
// funnel's weight so the pair sits together happily.
function SortGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 4.75v14.5m0 0-3-3.2m3 3.2 3-3.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5h6.5M13.5 11.2h5M13.5 15.9h3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />
    </svg>
  );
}

const GLYPHS = { filter: FilterGlyph, sort: SortGlyph };

const TONE_TEXT = {
  warning: "text-warning",
  success: "text-success",
  destructive: "text-destructive",
} as const;

function hrefFor(
  basePath: string,
  params: Record<string, string | undefined>,
  group: MenuGroup,
  option: MenuOption,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  // The default option is expressed by leaving the key out entirely, so a
  // plain "/admin/tickets" is always the unfiltered view.
  if (option.value === group.defaultValue) next.delete(group.param);
  else next.set(group.param, option.value);
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Filter/sort control: one button that opens a menu of the available views.
 * Server pages pass their current search params in, so this needs no router
 * hooks and every option stays a real link (middle-click, prefetch, back).
 */
export function FilterMenu({
  basePath,
  params,
  groups,
  label = "Filter",
  icon = "filter",
  align = "start",
  className,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  groups: MenuGroup[];
  label?: string;
  icon?: keyof typeof GLYPHS;
  align?: "start" | "end";
  className?: string;
}) {
  const Glyph = GLYPHS[icon];

  const activeOptions = groups
    .map((group) => group.options.find((o) => o.value === group.value))
    .filter((o): o is MenuOption => !!o);
  const changed = groups.filter((g) => g.value !== g.defaultValue);
  // The button says what you're looking at, not just "Filter" — the whole
  // point of collapsing the chips is that the state must stay visible.
  const summary =
    changed.length === 0
      ? label
      : changed.length === 1
        ? (activeOptions.find((o) => o.value === changed[0].value)?.label ??
          label)
        : `${changed.length} applied`;

  const clearHref = (() => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && !groups.some((g) => g.param === key)) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group inline-flex items-center gap-2.5 rounded-xl border py-2 pr-3 pl-2.5 text-sm transition-all duration-200 outline-none",
          "hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
          changed.length > 0
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
          className,
        )}
      >
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg transition-colors",
            changed.length > 0
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-primary",
          )}
        >
          <Glyph className="size-4" />
        </span>
        <span className="max-w-44 truncate font-medium">{summary}</span>
        {changed.length > 0 ? (
          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        ) : null}
        <ChevronDown className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-64 p-1.5">
        {groups.map((group, groupIndex) => (
          <div key={group.param}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </DropdownMenuLabel>
            {group.options.map((option) => {
              const active = option.value === group.value;
              return (
                <DropdownMenuItem key={option.value} asChild>
                  <Link
                    href={hrefFor(basePath, params, group, option)}
                    scroll={false}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5",
                      active && "bg-accent/70",
                    )}
                  >
                    <Check
                      className={cn(
                        "size-3.5 shrink-0 text-primary transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate",
                          active && "font-medium",
                          option.tone && TONE_TEXT[option.tone],
                        )}
                      >
                        {option.label}
                      </span>
                      {option.hint ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {option.hint}
                        </span>
                      ) : null}
                    </span>
                    {option.count !== undefined ? (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {option.count}
                      </span>
                    ) : null}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}

        {changed.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={clearHref}
                scroll={false}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground"
              >
                <X className="size-3.5" /> Clear
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
