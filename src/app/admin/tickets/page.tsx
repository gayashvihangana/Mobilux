import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getShopInfo } from "@/lib/settings";
import { whatsappHref } from "@/lib/phone";
import { statusLabel } from "@/lib/status";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { PhoneGlyph } from "@/components/admin/phone-glyph";
import { NextStepButton } from "@/components/admin/next-step-button";
import { BoardColumns, type BoardColumn } from "./board-columns";

export const metadata: Metadata = {
  title: "Repairs",
};

const DAY_MS = 86_400_000;
const PAGE_SIZE = 20;

type View = "board" | "done" | "unpaid";

// One column per step a device in the shop can be at. Legacy READY_FOR_PICKUP
// tickets share the "Ready for pickup" column with COMPLETED.
const COLUMNS: {
  key: string;
  statuses: TicketStatus[];
  tintClass: string;
  titleClass?: string;
  imageClass: string;
  screenClass: string;
}[] = [
  {
    key: "RECEIVED",
    statuses: ["RECEIVED"],
    tintClass: "bg-secondary",
    imageClass: "bg-primary/10",
    screenClass: "fill-primary/45",
  },
  {
    key: "DIAGNOSING",
    statuses: ["DIAGNOSING"],
    tintClass: "bg-secondary",
    imageClass: "bg-primary/10",
    screenClass: "fill-primary",
  },
  {
    key: "AWAITING_PARTS",
    statuses: ["AWAITING_PARTS"],
    tintClass: "bg-warning-soft",
    titleClass: "text-warning",
    imageClass: "bg-warning-tint",
    screenClass: "fill-amber",
  },
  {
    key: "IN_PROGRESS",
    statuses: ["IN_PROGRESS"],
    tintClass: "bg-primary/10",
    titleClass: "text-primary",
    imageClass: "bg-primary",
    screenClass: "fill-primary-foreground",
  },
  {
    key: "COMPLETED",
    statuses: ["COMPLETED", "READY_FOR_PICKUP"],
    tintClass: "bg-success/12",
    titleClass: "text-success",
    imageClass: "",
    screenClass: "",
  },
];

const BOARD_STATUSES = COLUMNS.flatMap((c) => c.statuses);
const REQUEST_STATUSES: TicketStatus[] = ["SUBMITTED", "CONFIRMED"];
const FINISHED_STATUSES: TicketStatus[] = ["PICKED_UP", "CANCELLED"];

// Billed, with nothing recorded against it — the same rule as Today.
const UNPAID_WHERE = {
  finalCost: { not: null },
  paidAt: null,
  paidAmount: null,
  status: { not: "CANCELLED" },
  payments: { none: { status: "PAID" } },
} satisfies Prisma.RepairTicketWhereInput;

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  brand: true,
  model: true,
  issueTitle: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  customerName: true,
  customerPhone: true,
  estimatedCost: true,
  finalCost: true,
  paidAmount: true,
  customer: { select: { name: true, phone: true } },
  payments: { where: { status: "PAID" }, select: { amount: true } },
} satisfies Prisma.RepairTicketSelect;

type Ticket = Prisma.RepairTicketGetPayload<{ select: typeof TICKET_SELECT }>;

/** The colour of each step's button on the Board, as in the approved design. */
function boardTone(status: TicketStatus): "primary" | "secondary" | "ink" {
  if (status === "IN_PROGRESS") return "primary";
  if (status === "COMPLETED" || status === "READY_FOR_PICKUP") return "ink";
  return "secondary";
}

function deviceName(t: Pick<Ticket, "brand" | "model">) {
  return [t.brand, t.model].filter(Boolean).join(" ") || "Device";
}

function ownerName(t: Pick<Ticket, "customerName" | "customer">) {
  return t.customer?.name ?? t.customerName ?? "Walk-in";
}

/** "Tharushi Silva" becomes "Tharushi S." so the day count still fits on a card. */
function shortName(name: string) {
  const parts = name.trim().split(/s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
}

function phoneOf(t: Pick<Ticket, "customerPhone" | "customer">) {
  return t.customerPhone || t.customer?.phone || null;
}

/** "today", "day 2", "day 5" — counted from when the device came in. */
function dayOf(createdAt: Date, now: number) {
  const days = Math.floor((now - createdAt.getTime()) / DAY_MS);
  return days <= 0 ? "today" : `day ${days + 1}`;
}

/** What is still owed: the bill (or the quote, before a bill), less payments. */
function toCollect(t: Ticket) {
  const due = t.finalCost ?? t.estimatedCost;
  if (due === null) return null;
  const online = t.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paid = online > 0 ? online : Number(t.paidAmount ?? 0);
  return Math.max(0, Math.round(Number(due) - paid));
}

/** Search by REP number, customer name, phone, device or problem. */
function matches(t: Ticket, q: string) {
  const text = q.toLowerCase();
  const haystack = [t.ticketNumber, ownerName(t), t.brand, t.model, t.issueTitle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes(text)) return true;
  const digits = q.replace(/\D/g, "");
  const phone = phoneOf(t)?.replace(/\D/g, "");
  return digits.length >= 3 && !!phone && phone.includes(digits);
}

function viewHref(view: View, q?: string, page?: number) {
  const params = new URLSearchParams();
  if (view !== "board") params.set("view", view);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/tickets?${query}` : "/admin/tickets";
}

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 80) || undefined;
  // Older links (Today, Shop numbers) use ?status=; keep them working.
  const view: View =
    params.view === "done" || params.view === "unpaid"
      ? params.view
      : params.status === "unpaid"
        ? "unpaid"
        : FINISHED_STATUSES.includes(params.status as TicketStatus)
          ? "done"
          : "board";
  const initialColumn = COLUMNS.find((c) =>
    c.statuses.includes(params.status as TicketStatus),
  )?.key;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [open, unpaidCount, shop] = await Promise.all([
    prisma.repairTicket.findMany({
      where: { status: { in: [...BOARD_STATUSES, ...REQUEST_STATUSES] } },
      orderBy: { createdAt: "asc" },
      select: TICKET_SELECT,
    }),
    prisma.repairTicket.count({ where: UNPAID_WHERE }),
    getShopInfo(),
  ]);

  const now = Date.now();
  const shown = q ? open.filter((t) => matches(t, q)) : open;
  const onBoard = shown.filter((t) => BOARD_STATUSES.includes(t.status));
  const requests = shown.filter((t) => REQUEST_STATUSES.includes(t.status));
  const openTickets = open.filter((t) => BOARD_STATUSES.includes(t.status));
  const openCount = openTickets.length;
  const stale = openTickets.filter(
    (t) => now - t.updatedAt.getTime() > 3 * DAY_MS,
  ).length;

  // The list views (finished, unpaid, and finished matches for a search).
  let list: Ticket[] = [];
  let listTotal = 0;
  if (view !== "board" || q) {
    const where: Prisma.RepairTicketWhereInput =
      view === "unpaid" ? UNPAID_WHERE : { status: { in: FINISHED_STATUSES } };
    if (q) {
      // Search runs in memory so a phone typed as 0771234567 still finds
      // "077 123 4567"; a shop's history is small enough for that.
      const all = await prisma.repairTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: TICKET_SELECT,
      });
      const found = all.filter((t) => matches(t, q));
      listTotal = found.length;
      list = found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    } else {
      [list, listTotal] = await Promise.all([
        prisma.repairTicket.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: TICKET_SELECT,
        }),
        prisma.repairTicket.count({ where }),
      ]);
    }
  }
  const pages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  const columns: BoardColumn[] = COLUMNS.map((column) => {
    const tickets = onBoard.filter((t) => column.statuses.includes(t.status));
    let content: React.ReactNode;
    if (tickets.length === 0) {
      content = (
        <p className="px-1.5 pb-2 text-sm text-muted-foreground">
          {q ? "No matches here." : "Nothing here."}
        </p>
      );
    } else {
      content = tickets.map((t) =>
        column.key === "COMPLETED" ? (
          <ReadyCard key={t.id} ticket={t} shopName={shop.name} />
        ) : (
          <RepairCard
            key={t.id}
            ticket={t}
            now={now}
            imageClass={column.imageClass}
            screenClass={column.screenClass}
          />
        ),
      );
    }
    return {
      key: column.key,
      label: statusLabel(column.statuses[0]),
      count: tickets.length,
      tintClass: column.tintClass,
      titleClass: column.titleClass,
      content,
    };
  });

  const tabs: { view: View; label: string; count?: number }[] = [
    { view: "board", label: "Board", count: openCount },
    { view: "done", label: "Finished" },
    { view: "unpaid", label: "Unpaid", count: unpaidCount },
  ];

  let emptyList = "No finished repairs yet.";
  if (view === "unpaid") emptyList = q ? "No unpaid bills match." : "Every bill is paid.";
  else if (q) emptyList = "No finished repairs match.";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Repairs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {openCount} open repair{openCount === 1 ? "" : "s"}
            {stale > 0 ? ` · ${stale} waiting more than 3 days` : ""}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/tickets/new">
            <Plus /> New repair
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form action="/admin/tickets" className="relative md:w-96" role="search">
          {view !== "board" ? <input type="hidden" name="view" value={view} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search REP, name, phone or device"
            aria-label="Search repairs"
            className="rounded-full border-transparent bg-card pl-11"
          />
        </form>
        <nav aria-label="Repair views" className="flex gap-1 rounded-full bg-card p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.view}
              href={viewHref(tab.view, q)}
              aria-current={view === tab.view ? "page" : undefined}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors md:flex-none",
                view === tab.view
                  ? "bg-ink text-ink-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    view === tab.view && "bg-ink-foreground/20",
                    view !== tab.view &&
                      (tab.view === "unpaid"
                        ? "bg-warning/15 text-warning"
                        : "bg-secondary"),
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>

      {q ? (
        <p className="text-sm text-muted-foreground">
          Showing matches for <span className="font-bold text-foreground">“{q}”</span>.{" "}
          <Link
            href={viewHref(view)}
            className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline"
          >
            Clear search
          </Link>
        </p>
      ) : null}

      {view === "board" ? (
        <>
          {requests.length > 0 ? (
            <section className="rounded-3xl bg-warning-soft p-3">
              <h2 className="px-1.5 pt-1 pb-2 text-[15px] font-extrabold text-warning">
                Online requests · {requests.length}
              </h2>
              <div className="grid gap-2 md:grid-cols-2">
                {requests.map((t) => (
                  <RepairRow key={t.id} ticket={t} />
                ))}
              </div>
            </section>
          ) : null}
          <BoardColumns columns={columns} initialKey={initialColumn} />
          {q ? (
            <ListSection
              title="Finished repairs"
              tickets={list}
              empty="No finished repairs match."
            />
          ) : null}
        </>
      ) : (
        <ListSection
          title={view === "unpaid" ? "Billed, not paid yet" : "Picked up and cancelled"}
          tickets={list}
          empty={emptyList}
        />
      )}

      {(view !== "board" || q) && pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          <PageLink href={viewHref(view, q, page - 1)} disabled={page <= 1}>
            <ChevronLeft /> Newer
          </PageLink>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <PageLink href={viewHref(view, q, page + 1)} disabled={page >= pages}>
            Older <ChevronRight />
          </PageLink>
        </nav>
      ) : null}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="secondary" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="secondary">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

const CARD_LINK =
  "after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50";

// A card on the board: picture, device, problem, customer, how long it has
// been in, and the one button that moves it on. The whole card opens the
// repair; the button sits above that link.
function RepairCard({
  ticket: t,
  now,
  imageClass,
  screenClass,
}: {
  ticket: Ticket;
  now: number;
  imageClass: string;
  screenClass: string;
}) {
  const stale = now - t.updatedAt.getTime() > 3 * DAY_MS;
  return (
    <article className="relative rounded-[18px] bg-card p-2">
      <div className={cn("grid h-20 place-items-center rounded-xl", imageClass)}>
        <PhoneGlyph className="h-14" screen={screenClass} />
      </div>
      <div className="px-1.5 pt-2.5 pb-2.5">
        <h3 className="text-[15px] leading-snug font-extrabold">
          <Link href={`/admin/tickets/${t.id}`} className={CARD_LINK}>
            {deviceName(t)}
          </Link>
        </h3>
        <p className="truncate text-sm text-muted-foreground">{t.issueTitle}</p>
        <p
          className={cn(
            "truncate text-sm",
            stale ? "font-bold text-warning" : "text-muted-foreground",
          )}
        >
          {shortName(ownerName(t))} · {dayOf(t.createdAt, now)}
        </p>
      </div>
      <NextStepButton
        ticketId={t.id}
        status={t.status}
        deviceName={deviceName(t)}
        estimatedCost={t.estimatedCost ? Number(t.estimatedCost) : null}
        tone={boardTone(t.status)}
        className="relative z-10 w-full"
      />
    </article>
  );
}

// Ready for pickup: what to collect, a WhatsApp reminder and "Picked up".
function ReadyCard({ ticket: t, shopName }: { ticket: Ticket; shopName: string }) {
  const amount = toCollect(t);
  const phone = phoneOf(t);
  const reminder = phone
    ? whatsappHref(
        phone,
        `Hi ${ownerName(t)}, your ${deviceName(t)} (${t.ticketNumber}) is repaired and ready to collect${
          amount ? `. Amount to pay: ${formatLKR(amount)}` : ""
        }. Thank you, ${shopName}`,
      )
    : null;
  let amountText = "No price yet";
  if (amount) amountText = `${formatLKR(amount)} to collect`;
  else if (amount === 0) amountText = "Paid";
  return (
    <article className="relative rounded-[18px] bg-card p-3">
      <h3 className="text-[15px] leading-snug font-extrabold">
        <Link href={`/admin/tickets/${t.id}`} className={CARD_LINK}>
          {deviceName(t)}
        </Link>
      </h3>
      <p className="truncate text-sm text-muted-foreground">
        {t.issueTitle} · {shortName(ownerName(t))}
      </p>
      <p className="text-sm font-bold">{amountText}</p>
      <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
        {reminder ? (
          <Button asChild variant="secondary" className="px-3">
            <a href={reminder} target="_blank" rel="noreferrer">
              Remind
            </a>
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="px-3"
            disabled
            title="No phone number on this repair"
          >
            Remind
          </Button>
        )}
        <NextStepButton
          ticketId={t.id}
          status={t.status}
          deviceName={deviceName(t)}
          tone="ink"
          className="w-full px-3"
        />
      </div>
    </article>
  );
}

function ListSection({
  title,
  tickets,
  empty,
}: {
  title: string;
  tickets: Ticket[];
  empty: string;
}) {
  return (
    <section className="space-y-2 rounded-3xl bg-card p-3 sm:p-4">
      <h2 className="px-1.5 pt-1 pb-1 text-[15px] font-extrabold">{title}</h2>
      {tickets.length === 0 ? (
        <p className="px-1.5 pb-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        tickets.map((t) => <RepairRow key={t.id} ticket={t} />)
      )}
    </section>
  );
}

// One repair as a row: used for online requests and the list views.
function RepairRow({ ticket: t }: { ticket: Ticket }) {
  const bill = t.finalCost ?? t.estimatedCost;
  return (
    <Link
      href={`/admin/tickets/${t.id}`}
      className="flex min-w-0 items-center gap-3 rounded-2xl bg-card p-2 transition-colors hover:bg-accent"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary">
        <PhoneGlyph className="h-8" screen="fill-primary/50" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold">{deviceName(t)}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {t.ticketNumber} · {ownerName(t)} · {formatDate(t.completedAt ?? t.createdAt)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={t.status} />
        {bill ? (
          <span className="text-sm font-bold tabular-nums">
            {formatLKR(Math.round(Number(bill)))}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
