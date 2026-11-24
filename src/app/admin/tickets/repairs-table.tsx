"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ExternalLink, MoreHorizontal } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhoneGlyph } from "@/components/admin/phone-glyph";
import { NextStepButton } from "@/components/admin/next-step-button";
import { setTicketsArchived } from "@/lib/actions/tickets";
import { cn } from "@/lib/utils";

/** One repair, already shaped for display by the page. */
export type RepairRowData = {
  id: string;
  number: string;
  device: string;
  problem: string;
  customer: string;
  phone: string | null;
  status: TicketStatus;
  stepLabel: string;
  stepClass: string;
  /** "107 days" or "12 Aug 2026". */
  when: string;
  late: boolean;
  money: string;
  moneyClass?: string;
  estimatedCost: number | null;
  archived: boolean;
};

export type SortKey = "date" | "customer" | "step" | "money";

// Picture tile colour per step, as on the old board cards.
function tile(status: TicketStatus): { bg: string; screen: string } {
  switch (status) {
    case "AWAITING_PARTS":
    case "SUBMITTED":
    case "CONFIRMED":
      return { bg: "bg-warning-tint", screen: "fill-amber" };
    case "IN_PROGRESS":
      return { bg: "bg-primary", screen: "fill-primary-foreground" };
    case "COMPLETED":
    case "READY_FOR_PICKUP":
      return { bg: "bg-success/15", screen: "fill-card" };
    case "DIAGNOSING":
      return { bg: "bg-primary/10", screen: "fill-primary" };
    default:
      return { bg: "bg-secondary", screen: "fill-primary/45" };
  }
}

// Same columns on the heading row and on every card.
const GRID =
  "md:grid md:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_8.5rem_5.5rem_7rem_8.5rem_2.5rem] md:items-center md:gap-3";

// The repairs list: one rounded card per repair with its picture, the
// problem, the customer, the step, how long it has waited, the money and the
// next button. The "⋯" menu on each card archives (hides) it or brings it back.
export function RepairsTable({
  rows,
  sort,
  dir,
  sortHref,
  whenLabel,
  showNext,
}: {
  rows: RepairRowData[];
  sort: SortKey;
  dir: "asc" | "desc";
  /** Link for a heading: same filters, that sort (flips direction if already on it). */
  sortHref: Record<SortKey, string>;
  whenLabel: string;
  /** Next-step buttons, only on lists of open repairs. */
  showNext: boolean;
}) {
  const Heading = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <Link
      href={sortHref[k]}
      scroll={false}
      aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn("inline-flex min-h-8 items-center gap-1 hover:text-foreground", sort === k && "text-foreground")}
    >
      {children}
      {sort === k ? dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" /> : null}
    </Link>
  );

  return (
    <div className="space-y-2">
      {/* Headings (laptop): click to sort */}
      <div className={cn("hidden px-3 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase", GRID)}>
        <span />
        <span>Repair</span>
        <Heading k="customer">Customer</Heading>
        <Heading k="step">Step</Heading>
        <Heading k="date">{whenLabel}</Heading>
        <Heading k="money">Money</Heading>
        <span />
        <span />
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <RepairCard key={r.id} r={r} showNext={showNext} />
        ))}
      </ul>
    </div>
  );
}

function RepairCard({ r, showNext }: { r: RepairRowData; showNext: boolean }) {
  const t = tile(r.status);
  return (
    <li className={cn("relative rounded-[1.25rem] bg-card p-3 transition-colors hover:bg-accent/50", GRID)}>
      {/* Picture */}
      <span className={cn("hidden size-12 place-items-center rounded-xl md:grid", t.bg)}>
        <PhoneGlyph className="h-8" screen={t.screen} />
      </span>

      {/* Repair: device, problem, number. The name opens the repair; the
          link covers the card, buttons sit above it. */}
      <div className="min-w-0 pr-10 md:pr-0">
        <h3 className="text-[15px] leading-snug font-extrabold">
          <Link
            href={`/admin/tickets/${r.id}`}
            className="after:absolute after:inset-0 after:rounded-[1.25rem] focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            {r.device}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-foreground/75">{r.problem}</p>
        <p className="text-xs font-semibold text-muted-foreground">
          {r.number}
          {r.archived ? " · Archived" : ""}
          {/* Phone: customer here, the rest below */}
          <span className="md:hidden"> · {r.customer}</span>
        </p>
      </div>

      {/* Customer */}
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-bold">{r.customer}</p>
        {r.phone ? <p className="truncate text-xs text-muted-foreground">{r.phone}</p> : null}
      </div>

      {/* Step, waiting and money: one line on a phone */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:contents">
        <span className={cn("inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", r.stepClass)}>
          {r.stepLabel}
        </span>
        <span className={cn("text-sm whitespace-nowrap tabular-nums", r.late ? "font-bold text-destructive" : "text-muted-foreground")}>
          {r.when}
        </span>
        <span className={cn("text-sm font-bold whitespace-nowrap tabular-nums", r.moneyClass)}>{r.money}</span>
      </div>

      {/* Next step */}
      <div className="relative z-10 mt-3 md:mt-0">
        {showNext ? (
          <NextStepButton
            ticketId={r.id}
            status={r.status}
            deviceName={r.device}
            estimatedCost={r.estimatedCost}
            tone={r.status === "IN_PROGRESS" ? "primary" : r.status === "COMPLETED" || r.status === "READY_FOR_PICKUP" ? "ink" : "secondary"}
            className="h-10 w-full px-3 text-[13px]"
          />
        ) : null}
      </div>

      {/* ⋯ menu */}
      <div className="absolute top-2 right-2 z-10 md:static">
        <RowMenu r={r} />
      </div>
    </li>
  );
}

function RowMenu({ r }: { r: RepairRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = (archived: boolean) =>
    start(async () => {
      const res = await setTicketsArchived({ ticketIds: [r.id], archived });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(archived ? `${r.device} archived. Find it under Archived.` : `${r.device} is back in the list.`, {
        action: {
          label: "Undo",
          onClick: async () => {
            await setTicketsArchived({ ticketIds: [r.id], archived: !archived });
            router.refresh();
          },
        },
      });
      router.refresh();
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`More for ${r.device} ${r.number}`}
        disabled={pending}
        className="grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
      >
        <MoreHorizontal className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem asChild>
          <Link href={`/admin/tickets/${r.id}`}>
            <ExternalLink /> Open repair
          </Link>
        </DropdownMenuItem>
        {r.archived ? (
          <DropdownMenuItem onSelect={() => toggle(false)}>
            <ArchiveRestore /> Bring back
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => toggle(true)}>
            <Archive /> Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
