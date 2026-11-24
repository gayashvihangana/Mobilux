import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  LayoutGrid,
  List,
  MessageCircle,
  Plus,
  Search,
} from "lucide-react";
import type { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fillMessage, getShopInfo } from "@/lib/settings";
import { whatsappHref } from "@/lib/phone";
import { repairStepIndex, REPAIR_STEPS, statusLabel } from "@/lib/status";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NextStepButton } from "@/components/admin/next-step-button";
import { RepairsTable, type RepairRowData, type SortKey } from "./repairs-table";

export const metadata: Metadata = {
  title: "Repairs",
};

// The Repairs page, as in docs/design-samples/repairs-active-list.html.
// It opens on every active repair as a list (like an online shop's orders
// page), newest first. Tabs switch to all repairs, unpaid bills or archived
// ones; step chips narrow the list; the views show the same repairs as a
// list, a list with the repair beside it, or wide cards grouped by step.

const DAY_MS = 86_400_000;
const PAGE_SIZE = 50;

type Scope = "active" | "all" | "unpaid" | "archived";
type ViewMode = "list" | "split" | "groups";

// The steps a repair can be at, in order, with the chip and pill colours.
const STEPS: { key: string; label: string; statuses: TicketStatus[]; pill: string; active: boolean }[] = [
  { key: "requests", label: "Online requests", statuses: ["SUBMITTED", "CONFIRMED"], pill: "bg-warning-soft text-warning", active: true },
  { key: "received", label: "Received", statuses: ["RECEIVED"], pill: "bg-secondary text-foreground/75", active: true },
  { key: "diagnosing", label: "Diagnosing", statuses: ["DIAGNOSING"], pill: "bg-secondary text-foreground/75", active: true },
  { key: "parts", label: "Waiting for parts", statuses: ["AWAITING_PARTS"], pill: "bg-warning-soft text-warning", active: true },
  { key: "repairing", label: "Repairing", statuses: ["IN_PROGRESS"], pill: "bg-primary/10 text-primary", active: true },
  { key: "ready", label: "Ready for pickup", statuses: ["COMPLETED", "READY_FOR_PICKUP"], pill: "bg-success/12 text-success", active: true },
  { key: "collected", label: "Picked up", statuses: ["PICKED_UP"], pill: "bg-secondary text-muted-foreground", active: false },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED"], pill: "bg-destructive/10 text-destructive", active: false },
];
const ACTIVE_STATUSES = STEPS.filter((s) => s.active).flatMap((s) => s.statuses);
const stepOf = (status: TicketStatus) => STEPS.find((s) => s.statuses.includes(status))!;
const stepOrder = (status: TicketStatus) => STEPS.findIndex((s) => s.statuses.includes(status));

// Billed, with nothing recorded against it — the same rule as Today.
const UNPAID_WHERE = {
  finalCost: { not: null },
  paidAt: null,
  paidAmount: null,
  status: { not: "CANCELLED" },
  payments: { none: { status: "PAID" } },
} satisfies Prisma.RepairTicketWhereInput;

const SCOPE_WHERE: Record<Scope, Prisma.RepairTicketWhereInput> = {
  active: { status: { in: ACTIVE_STATUSES }, archivedAt: null },
  all: { archivedAt: null },
  unpaid: { ...UNPAID_WHERE, archivedAt: null },
  archived: { archivedAt: { not: null } },
};

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
  archivedAt: true,
  customerName: true,
  customerPhone: true,
  estimatedCost: true,
  finalCost: true,
  paidAmount: true,
  customer: { select: { name: true, phone: true } },
  payments: { where: { status: "PAID" }, select: { amount: true } },
} satisfies Prisma.RepairTicketSelect;

type Ticket = Prisma.RepairTicketGetPayload<{ select: typeof TICKET_SELECT }>;

function deviceName(t: Pick<Ticket, "brand" | "model">) {
  return [t.brand, t.model].filter(Boolean).join(" ") || "Device";
}
function ownerName(t: Pick<Ticket, "customerName" | "customer">) {
  return t.customer?.name ?? t.customerName ?? "Walk-in";
}
function phoneOf(t: Pick<Ticket, "customerPhone" | "customer">) {
  return t.customerPhone || t.customer?.phone || null;
}
const isOpen = (t: Ticket) => ACTIVE_STATUSES.includes(t.status);

/** What is still owed: the bill (or quote before a bill), less every payment. */
function owed(t: Ticket) {
  const due = t.finalCost ?? t.estimatedCost;
  if (due === null) return null;
  const paid = Number(t.paidAmount ?? 0) + t.payments.reduce((s, p) => s + Number(p.amount), 0);
  return Math.max(0, Math.round(Number(due) - paid));
}

function moneyText(t: Ticket): { text: string; className?: string; sortValue: number } {
  const price = t.finalCost ?? t.estimatedCost;
  if (price === null) return { text: "No price yet", className: "font-normal text-muted-foreground", sortValue: -1 };
  const left = owed(t) ?? 0;
  const ready = t.status === "COMPLETED" || t.status === "READY_FOR_PICKUP";
  if (left === 0 && (ready || t.status === "PICKED_UP")) return { text: "Paid", className: "text-success", sortValue: Number(price) };
  return { text: `${formatLKR(Math.round(ready ? left : Number(price)))}${ready ? " due" : ""}`, sortValue: Number(price) };
}

function waited(t: Ticket, now: number) {
  const days = Math.floor((now - t.createdAt.getTime()) / DAY_MS);
  return days <= 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`;
}

/** Search by repair number, customer name, phone, device or problem. */
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

type Params = {
  scope: Scope;
  view: ViewMode;
  step?: string;
  q?: string;
  sort: SortKey;
  dir: "asc" | "desc";
  page?: number;
  open?: string;
};

function href(p: Params, patch: Partial<Params> = {}) {
  const v = { ...p, ...patch };
  const s = new URLSearchParams();
  if (v.scope !== "active") s.set("scope", v.scope);
  if (v.view !== "list") s.set("view", v.view);
  if (v.step) s.set("step", v.step);
  if (v.q) s.set("q", v.q);
  if (v.sort !== "date") s.set("sort", v.sort);
  if (v.dir !== "desc") s.set("dir", v.dir);
  if (v.page && v.page > 1) s.set("page", String(v.page));
  if (v.open) s.set("open", v.open);
  const q = s.toString();
  return q ? `/admin/tickets?${q}` : "/admin/tickets";
}

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  // Older links: ?view=done / ?view=unpaid / ?status=COMPLETED etc.
  const legacyStep = raw.status ? STEPS.find((s) => s.statuses.includes(raw.status as TicketStatus))?.key : undefined;
  let scope: Scope =
    raw.scope === "all" || raw.scope === "unpaid" || raw.scope === "archived" ? raw.scope : "active";
  if (raw.view === "unpaid" || raw.status === "unpaid") scope = "unpaid";
  if (raw.view === "done") scope = "all";
  const p: Params = {
    scope,
    view: raw.view === "split" || raw.view === "groups" ? raw.view : "list",
    step: STEPS.some((s) => s.key === raw.step) ? raw.step : legacyStep,
    q: raw.q?.trim().slice(0, 80) || undefined,
    sort: raw.sort === "customer" || raw.sort === "step" || raw.sort === "money" ? raw.sort : "date",
    dir: raw.dir === "asc" ? "asc" : "desc",
    page: Math.max(1, Number.parseInt(raw.page ?? "1", 10) || 1),
    open: raw.open,
  };
  if (raw.view === "done" && !p.step) p.step = "collected";

  const [tickets, counts, shop] = await Promise.all([
    prisma.repairTicket.findMany({ where: SCOPE_WHERE[p.scope], select: TICKET_SELECT }),
    Promise.all([
      prisma.repairTicket.count({ where: SCOPE_WHERE.active }),
      prisma.repairTicket.count({ where: SCOPE_WHERE.unpaid }),
      prisma.repairTicket.count({ where: SCOPE_WHERE.archived }),
    ]),
    getShopInfo(),
  ]);
  const [activeCount, unpaidCount, archivedCount] = counts;
  const now = Date.now();

  // Search (in memory so "0771234567" still finds "077 123 4567"), then step.
  const searched = p.q ? tickets.filter((t) => matches(t, p.q!)) : tickets;
  const stepsHere = STEPS.filter((s) => (p.scope === "active" ? s.active : true))
    .map((s) => ({ ...s, count: searched.filter((t) => s.statuses.includes(t.status)).length }))
    .filter((s) => s.count > 0 || p.scope === "active");
  const step = STEPS.find((s) => s.key === p.step);
  const filtered = step ? searched.filter((t) => step.statuses.includes(t.status)) : searched;

  // Sort. Default: newest first.
  const sign = p.dir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    let d = 0;
    if (p.sort === "customer") d = ownerName(a).localeCompare(ownerName(b));
    else if (p.sort === "step") d = stepOrder(a.status) - stepOrder(b.status);
    else if (p.sort === "money") d = moneyText(a).sortValue - moneyText(b).sortValue;
    if (d === 0) d = a.createdAt.getTime() - b.createdAt.getTime();
    return d * sign;
  });

  // Active repairs all fit on one page; history pages in 50s.
  const paged = p.scope === "active";
  const pages = paged ? 1 : Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(p.page ?? 1, pages);
  const shown = paged ? sorted : sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows: RepairRowData[] = shown.map((t) => {
    const s = stepOf(t.status);
    const m = moneyText(t);
    const open = isOpen(t);
    const phone = phoneOf(t);
    return {
      id: t.id,
      number: t.ticketNumber,
      device: deviceName(t),
      problem: t.issueTitle,
      customer: ownerName(t),
      phone,
      status: t.status,
      stepLabel: s.key === "requests" ? statusLabel(t.status) : s.label,
      stepClass: s.pill,
      when: open ? waited(t, now) : formatDate(t.completedAt ?? t.createdAt),
      late: open && now - t.updatedAt.getTime() > 3 * DAY_MS,
      money: m.text,
      moneyClass: m.className,
      estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
      archived: !!t.archivedAt,
    };
  });

  const sortHref = Object.fromEntries(
    (["date", "customer", "step", "money"] as SortKey[]).map((k) => [
      k,
      href(p, {
        sort: k,
        dir: p.sort === k ? (p.dir === "asc" ? "desc" : "asc") : k === "date" || k === "money" ? "desc" : "asc",
        page: 1,
      }),
    ]),
  ) as Record<SortKey, string>;

  const lateCount = p.scope === "active" ? tickets.filter((t) => now - t.updatedAt.getTime() > 3 * DAY_MS).length : 0;
  const readyCount = tickets.filter((t) => t.status === "COMPLETED" || t.status === "READY_FOR_PICKUP").length;
  const scopes: { key: Scope; label: string; count?: number }[] = [
    { key: "active", label: "Active", count: activeCount },
    { key: "all", label: "All repairs" },
    { key: "unpaid", label: "Unpaid", count: unpaidCount },
    { key: "archived", label: "Archived", count: archivedCount },
  ];
  const views: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: "list", label: "List", icon: <List className="size-4" /> },
    { key: "split", label: "Side by side", icon: <Columns2 className="size-4" /> },
    { key: "groups", label: "By step", icon: <LayoutGrid className="size-4" /> },
  ];

  const emptyText = p.q
    ? "No repairs match your search."
    : p.scope === "archived"
      ? "Nothing archived. Use the ⋯ menu on a repair and pick Archive to hide it here."
      : p.scope === "unpaid"
        ? "Every bill is paid."
        : step
          ? `No repairs at ${step.label.toLowerCase()}.`
          : "No repairs yet.";

  return (
    <div className="space-y-4">
      {/* ── Title ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Repairs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount} active
            {readyCount > 0 && p.scope === "active" ? ` · ${readyCount} ready for pickup` : ""}
            {lateCount > 0 ? ` · ${lateCount} waiting more than 3 days` : ""}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/tickets/new">
            <Plus /> New repair
          </Link>
        </Button>
      </div>

      {/* ── Which repairs, how to show them, search ──── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Which repairs" className="flex gap-1 overflow-x-auto rounded-2xl bg-card p-1 [scrollbar-width:none]">
          {scopes.map((s) => (
            <Link
              key={s.key}
              href={href(p, { scope: s.key, step: undefined, page: 1, open: undefined })}
              aria-current={p.scope === s.key ? "page" : undefined}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-bold whitespace-nowrap transition-colors lg:flex-none",
                p.scope === s.key ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              {s.count ? (
                <span className={cn("rounded-full px-1.5 text-xs", p.scope === s.key ? "bg-ink-foreground/20" : "bg-secondary")}>
                  {s.count}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <form id="search" action="/admin/tickets" className="relative min-w-0 flex-1 scroll-mt-24 lg:w-80 lg:flex-none" role="search">
            {p.scope !== "active" ? <input type="hidden" name="scope" value={p.scope} /> : null}
            {p.view !== "list" ? <input type="hidden" name="view" value={p.view} /> : null}
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={p.q}
              placeholder="Search number, name, phone or device"
              aria-label="Search repairs"
              className="h-12 rounded-2xl border-transparent bg-card pl-11"
            />
          </form>
          <nav aria-label="View" className="hidden gap-1 rounded-2xl bg-card p-1 md:flex">
            {views.map((v) => (
              <Link
                key={v.key}
                href={href(p, { view: v.key, open: undefined })}
                aria-current={p.view === v.key ? "page" : undefined}
                title={v.label}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold whitespace-nowrap transition-colors",
                  p.view === v.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v.icon}
                <span className="hidden xl:inline">{v.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Step chips ─────────────────────────────────── */}
      <nav aria-label="Step" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <Chip href={href(p, { step: undefined, page: 1, open: undefined })} on={!step} label={p.scope === "active" ? "All active" : "All"} count={searched.length} />
        {stepsHere.map((s) => (
          <Chip key={s.key} href={href(p, { step: s.key, page: 1, open: undefined })} on={step?.key === s.key} label={s.label} count={s.count} />
        ))}
      </nav>

      {p.q ? (
        <p className="text-sm text-muted-foreground">
          Showing matches for <span className="font-bold text-foreground">“{p.q}”</span>.{" "}
          <Link href={href(p, { q: undefined, page: 1 })} className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline">
            Clear search
          </Link>
        </p>
      ) : null}

      {/* ── The repairs ───────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="rounded-[1.5rem] bg-card px-6 py-14 text-center text-muted-foreground">{emptyText}</p>
      ) : p.view === "split" ? (
        <SplitView p={p} tickets={shown} rows={rows} shopName={shop.name} readyTemplate={shop.msgReady} />
      ) : p.view === "groups" ? (
        <GroupedView tickets={shown} rows={rows} shopName={shop.name} readyTemplate={shop.msgReady} />
      ) : (
        <RepairsTable
          rows={rows}
          sort={p.sort}
          dir={p.dir}
          sortHref={sortHref}
          whenLabel={p.scope === "active" ? "Waiting" : "Date"}
          showNext={p.scope === "active" || shown.some(isOpen)}
        />
      )}

      {pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          <PageLink href={href(p, { page: page - 1 })} disabled={page <= 1}>
            <ChevronLeft /> Back
          </PageLink>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages} · {sorted.length} repairs
          </span>
          <PageLink href={href(p, { page: page + 1 })} disabled={page >= pages}>
            Next <ChevronRight />
          </PageLink>
        </nav>
      ) : null}
    </div>
  );
}

function Chip({ href, on, label, count }: { href: string; on: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={on ? "true" : undefined}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold whitespace-nowrap transition-colors",
        on ? "bg-ink text-ink-foreground" : "bg-card text-foreground hover:bg-accent",
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 text-xs", on ? "bg-ink-foreground/20" : "bg-secondary")}>{count}</span>
    </Link>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
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

function reminderHref(t: Ticket, shopName: string, template: string) {
  const phone = phoneOf(t);
  if (!phone) return null;
  const amount = owed(t);
  return whatsappHref(
    phone,
    fillMessage(template, {
      name: ownerName(t).split(/\s+/)[0],
      device: deviceName(t),
      ticket: t.ticketNumber,
      amount: amount ? formatLKR(amount) : "to be confirmed",
      shop: shopName,
    }),
  );
}

const toneFor = (status: TicketStatus) =>
  status === "IN_PROGRESS" ? "primary" : status === "COMPLETED" || status === "READY_FOR_PICKUP" ? "ink" : "secondary";

// ── Side by side: slim list, the picked repair beside it ─────────────

async function SplitView({
  p,
  tickets,
  rows,
  shopName,
  readyTemplate,
}: {
  p: Params;
  tickets: Ticket[];
  rows: RepairRowData[];
  shopName: string;
  readyTemplate: string;
}) {
  const picked = tickets.find((t) => t.id === p.open) ?? tickets[0];
  const row = rows.find((r) => r.id === picked.id)!;
  const lastNote = await prisma.statusUpdate.findFirst({
    where: { ticketId: picked.id, note: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { note: true, createdAt: true },
  });
  const stepIdx = repairStepIndex(picked.status);
  const reminder =
    picked.status === "COMPLETED" || picked.status === "READY_FOR_PICKUP" ? reminderHref(picked, shopName, readyTemplate) : null;
  const phone = phoneOf(picked);
  const chat = phone ? whatsappHref(phone, `Hi ${row.customer.split(/\s+/)[0]}, `) : null;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(18rem,26rem)_1fr]">
      <ul className="max-h-[calc(100dvh-16rem)] overflow-y-auto rounded-[1.5rem] bg-card">
        {rows.map((r) => (
          <li key={r.id} className="border-t border-border first:border-t-0">
            <Link
              href={href(p, { open: r.id })}
              scroll={false}
              aria-current={r.id === picked.id ? "true" : undefined}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60",
                r.id === picked.id && "bg-primary/8 shadow-[inset_3px_0_0_var(--primary)]",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold leading-snug">{r.device}</span>
                <span className="block truncate text-sm text-foreground/75">{r.problem}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {r.customer} · {r.number}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", r.stepClass)}>{r.stepLabel}</span>
                <span className={cn("text-xs tabular-nums", r.late ? "font-bold text-destructive" : "text-muted-foreground")}>{r.when}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="hidden flex-col gap-4 self-start rounded-[1.5rem] bg-card p-5 md:flex">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-[1.25rem] bg-ink p-5 text-ink-foreground">
          <div className="min-w-0">
            <p className="text-sm opacity-80">
              {picked.ticketNumber} · {row.customer}
              {row.phone ? ` · ${row.phone}` : ""}
            </p>
            <h2 className="font-display mt-1 text-2xl font-extrabold tracking-tight">{row.device}</h2>
            <p className="opacity-85">{row.problem}</p>
          </div>
          <NextStepButton
            ticketId={picked.id}
            status={picked.status}
            deviceName={row.device}
            estimatedCost={row.estimatedCost}
            tone="secondary"
            className="bg-ink-foreground text-ink hover:bg-ink-foreground/90"
          />
        </div>

        {stepIdx >= 0 ? (
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-bold" aria-label="Steps">
            {REPAIR_STEPS.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-1.5", i < stepIdx ? "text-foreground" : i === stepIdx ? "text-primary" : "text-muted-foreground")}>
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs",
                    i < stepIdx ? "bg-ink text-ink-foreground" : i === stepIdx ? "bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  {i < stepIdx ? "✓" : i + 1}
                </span>
                {s === "COMPLETED" ? "Ready" : statusLabel(s)}
                {i < REPAIR_STEPS.length - 1 ? <span aria-hidden="true" className="ml-1 h-0.5 w-4 bg-border" /> : null}
              </li>
            ))}
          </ol>
        ) : (
          <span className={cn("w-fit rounded-full px-3 py-1 text-sm font-bold", row.stepClass)}>{row.stepLabel}</span>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-1 rounded-2xl bg-secondary/60 p-4 text-sm">
            <p className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">Customer</p>
            <p className="font-bold">{row.customer}</p>
            {row.phone ? <p className="text-muted-foreground">{row.phone}</p> : null}
            {chat ? (
              <a href={chat} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 font-bold text-primary hover:underline">
                <MessageCircle className="size-4" /> Message on WhatsApp
              </a>
            ) : null}
          </div>
          <div className="space-y-1 rounded-2xl bg-secondary/60 p-4 text-sm">
            <p className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">Money</p>
            <p className={cn("font-bold tabular-nums", row.moneyClass)}>{row.money}</p>
            <Link href={`/admin/tickets/${picked.id}/bill`} className="inline-flex min-h-9 items-center font-bold text-primary hover:underline">
              {picked.finalCost ? "Open bill" : "Make bill"}
            </Link>
          </div>
        </div>

        {lastNote?.note ? (
          <div className="space-y-1 rounded-2xl bg-secondary/60 p-4 text-sm">
            <p className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">Latest note</p>
            <p className="whitespace-pre-wrap">{lastNote.note}</p>
            <p className="text-xs text-muted-foreground">{formatDate(lastNote.createdAt)}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={`/admin/tickets/${picked.id}`}>Open full repair</Link>
          </Button>
          {reminder ? (
            <Button asChild variant="secondary">
              <a href={reminder} target="_blank" rel="noreferrer">
                Remind to collect
              </a>
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// ── By step: one section per step, wide cards ────────────────────────

function GroupedView({
  tickets,
  rows,
  shopName,
  readyTemplate,
}: {
  tickets: Ticket[];
  rows: RepairRowData[];
  shopName: string;
  readyTemplate: string;
}) {
  const groups = STEPS.map((s) => ({
    step: s,
    items: rows.filter((r) => s.statuses.includes(r.status)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map(({ step, items }) => (
        <section key={step.key} aria-label={step.label}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
            <span className={cn("rounded-full px-3 py-1 text-sm", step.pill)}>{step.label}</span>
            <span className="text-sm font-bold text-muted-foreground">{items.length}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((r) => {
              const t = tickets.find((x) => x.id === r.id)!;
              const reminder =
                r.status === "COMPLETED" || r.status === "READY_FOR_PICKUP" ? reminderHref(t, shopName, readyTemplate) : null;
              return (
                <article key={r.id} className="relative flex flex-col gap-3 rounded-[1.5rem] bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[17px] leading-snug font-extrabold">
                        <Link
                          href={`/admin/tickets/${r.id}`}
                          className="after:absolute after:inset-0 after:rounded-[1.5rem] focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
                        >
                          {r.device}
                        </Link>
                      </h3>
                      <p className="text-xs font-semibold text-muted-foreground">{r.number}</p>
                    </div>
                    <span className={cn("shrink-0 text-sm tabular-nums", r.late ? "font-bold text-destructive" : "text-muted-foreground")}>
                      {r.when}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[15px] text-foreground/80">{r.problem}</p>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-bold">{r.customer}</span>
                    <span className={cn("shrink-0 font-bold tabular-nums", r.moneyClass)}>{r.money}</span>
                  </div>
                  {isOpen(t) ? (
                    <div className="relative z-10 mt-auto flex gap-2">
                      <NextStepButton
                        ticketId={r.id}
                        status={r.status}
                        deviceName={r.device}
                        estimatedCost={r.estimatedCost}
                        tone={toneFor(r.status)}
                        className="flex-1"
                      />
                      {reminder ? (
                        <Button asChild variant="secondary">
                          <a href={reminder} target="_blank" rel="noreferrer">
                            Remind
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
