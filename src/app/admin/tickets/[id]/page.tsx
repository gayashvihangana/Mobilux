import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, Send, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { TrackingLink } from "@/components/tracking-link";
import { trackUrl } from "@/lib/track-qr";
import { StatusStepper } from "@/components/status-timeline";
import { PhoneGlyph } from "@/components/admin/phone-glyph";
import { JournalNote } from "@/components/journal-note";
import { Button } from "@/components/ui/button";
import { DEVICE_TYPES, isRewind, prevStatus, statusLabel } from "@/lib/status";
import { parseReceivedItems } from "@/lib/received-items";
import { parseParts, partsTotalCost, partsWithFallback } from "@/lib/parts";
import { issueChip } from "@/lib/repair-issue";
import { telHref, whatsappHref } from "@/lib/phone";
import { fillMessage, getShopInfo } from "@/lib/settings";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import { EditableStatusHistory } from "./editable-status-history";
import { MainAction, RepairMenu } from "./repair-actions";
import {
  AcceptTicketForm,
  BillNotesForm,
  ContactEditDialog,
  LinkCustomerForm,
  RepairIssuePanel,
  TicketDetailsForm,
} from "./ticket-admin-forms";

export const metadata: Metadata = {
  title: "Repair",
};

const TERMINAL = ["PICKED_UP", "CANCELLED"];

function toDateInput(date: Date | null) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const rupees = (value: number) => formatLKR(Math.round(value));

// The repair page: a blue header card with the one main action, the six
// steps in words, then who the customer is and what the money looks like.
// The timeline, bench issues, bill notes and payments follow below. On a
// phone the main action moves to a bar fixed at the bottom of the screen.
export default async function AdminTicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; edit?: string }>;
}) {
  const [{ id }, { created, edit }] = await Promise.all([params, searchParams]);

  const [ticket, customers, shop] = await Promise.all([
    prisma.repairTicket.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        statusUpdates: { orderBy: { createdAt: "desc" } },
        issues: { orderBy: { reportedAt: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    getShopInfo(),
  ]);
  if (!ticket) notFound();

  // Earlier repairs for the same person: the same account, or the same
  // phone number for walk-ins.
  const sameCustomer = [
    ...(ticket.customerId ? [{ customerId: ticket.customerId }] : []),
    ...(ticket.customerPhone ? [{ customerPhone: ticket.customerPhone }] : []),
  ];
  const earlierRepairs =
    sameCustomer.length > 0
      ? await prisma.repairTicket.count({
          where: {
            id: { not: ticket.id },
            createdAt: { lt: ticket.createdAt },
            OR: sameCustomer,
          },
        })
      : 0;

  const deviceLabel =
    DEVICE_TYPES.find((d) => d.value === ticket.deviceType)?.label ?? "Device";
  const deviceName =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") ||
    `Unknown ${deviceLabel.toLowerCase()}`;
  const ownerName = ticket.customer?.name ?? ticket.customerName ?? "Walk-in";
  const phone = ticket.customerPhone || ticket.customer?.phone || null;
  const link = trackUrl(ticket.trackToken);
  const firstName = ownerName.split(/\s+/)[0];

  // Quick-insert chips for the bill-notes editor: the diagnosis and
  // cancellation notes first (the two most-wanted), then any other note
  // the shop left on the timeline.
  const billNoteSuggestions = [
    ...ticket.statusUpdates
      .filter((u) => u.status === "DIAGNOSING" && u.note)
      .map((u) => ({ label: "Diagnosis", text: u.note as string })),
    ...ticket.statusUpdates
      .filter((u) => u.status === "CANCELLED" && u.note)
      .map((u) => ({ label: "Cancellation reason", text: u.note as string })),
    ...ticket.statusUpdates
      .filter(
        (u) => u.note && u.status !== "DIAGNOSING" && u.status !== "CANCELLED",
      )
      .map((u) => ({ label: statusLabel(u.status), text: u.note as string })),
  ];

  const receivedItems = parseReceivedItems(ticket.receivedItems);
  const partsList = partsWithFallback(
    ticket.parts,
    ticket.partsUsed,
    ticket.partsSupplier,
  );
  const chip = issueChip(ticket.issues, ticket.refunded);

  // Issues carry the parts the shop bought to fix its own mistake — internal
  // only, so they're attached for the admin panel and never leave it.
  const issuesWithParts = ticket.issues.map((issue) => ({
    ...issue,
    parts: parseParts(issue.parts),
  }));
  const issuePartsCost = issuesWithParts.reduce(
    (sum, issue) => sum + partsTotalCost(issue.parts),
    0,
  );

  // ── Money ──────────────────────────────────────────────────────
  const quoted = ticket.estimatedCost ? Number(ticket.estimatedCost) : null;
  const billed = ticket.finalCost ? Number(ticket.finalCost) : null;
  const paid = ticket.paidAmount ? Number(ticket.paidAmount) : null;
  const partsCost = ticket.partsCost ? Number(ticket.partsCost) : 0;
  const price = billed ?? quoted;
  const profit = price !== null ? price - partsCost : null;

  const estimatedCost = quoted;
  const terminal = TERMINAL.includes(ticket.status);
  // "Go back" returns to the step the repair was really at before, which is
  // not always the one before it in the list (steps can be skipped).
  const previousStep =
    ticket.statusUpdates.find(
      (u) => u.status !== ticket.status && isRewind(ticket.status, u.status),
    )?.status ?? prevStatus(ticket.status);
  const editHref = `/admin/tickets/${ticket.id}?edit=1#edit`;

  return (
    <div className={cn("space-y-4", !terminal && "pb-24 md:pb-0")}>
      <Link
        href="/admin/tickets"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All repairs
      </Link>

      {/* ── Header card ─────────────────────────────────────────── */}
      <section className="flex gap-6 rounded-[28px] bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="hidden size-40 shrink-0 place-items-end justify-center overflow-hidden rounded-[22px] bg-black/15 sm:grid">
          <PhoneGlyph
            className="-mb-6 h-36"
            body="fill-ink"
            screen="fill-primary-foreground"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <p className="text-sm font-semibold text-primary-foreground/85">
            {ticket.ticketNumber} · received {formatDate(ticket.createdAt)}
          </p>
          <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
            {deviceName}
          </h1>
          <p className="text-base text-primary-foreground/85">{ticket.issueTitle}</p>
          {chip || terminal ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {terminal ? (
                <StatusBadge
                  status={ticket.status}
                  className="border-transparent bg-primary-foreground text-foreground"
                />
              ) : null}
              {chip ? (
                <span className="inline-flex items-center rounded-full bg-primary-foreground px-2.5 py-1 text-xs font-semibold text-warning">
                  {chip.label}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2.5">
            <MainAction
              ticketId={ticket.id}
              status={ticket.status}
              deviceName={deviceName}
              estimatedCost={estimatedCost}
              tone="onPrimary"
              className="hidden md:inline-flex"
            />
            <Button
              asChild
              size="lg"
              className="bg-black/15 text-primary-foreground hover:bg-black/25"
            >
              <Link href={`/admin/tickets/${ticket.id}/bill`}>Bill</Link>
            </Button>
            <RepairMenu
              ticketId={ticket.id}
              ticketNumber={ticket.ticketNumber}
              status={ticket.status}
              previous={previousStep}
              deviceName={deviceName}
              className="bg-black/15 text-primary-foreground hover:bg-black/25"
            />
          </div>
        </div>
      </section>

      {/* ── Steps ───────────────────────────────────────────────── */}
      <section className="rounded-3xl bg-card p-4 sm:p-5">
        <StatusStepper
          status={ticket.status}
          cancelledFrom={
            ticket.statusUpdates.find((u) => u.status !== "CANCELLED")?.status ??
            null
          }
          issuePending={ticket.issues.some((i) => i.status === "PENDING")}
        />
      </section>

      {edit ? (
        <section id="edit" className="scroll-mt-20 rounded-3xl bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-extrabold">Edit repair details</h2>
            <Button asChild variant="ghost" size="icon" aria-label="Close editing">
              <Link href={`/admin/tickets/${ticket.id}`} scroll={false}>
                <X />
              </Link>
            </Button>
          </div>
          <TicketDetailsForm
            values={{
              ticketId: ticket.id,
              deviceType: ticket.deviceType,
              brand: ticket.brand,
              model: ticket.model,
              issueTitle: ticket.issueTitle,
              issueDescription: ticket.issueDescription,
              solution: ticket.solution,
              status: ticket.status,
              completedAt: toDateInput(ticket.completedAt),
              estimatedCost: ticket.estimatedCost?.toString() ?? null,
              finalCost: ticket.finalCost?.toString() ?? null,
              partsCost: ticket.partsCost?.toString() ?? null,
              paidAmount: ticket.paidAmount?.toString() ?? null,
              duration: ticket.duration,
              parts: partsList,
              issues: issuesWithParts.map((issue) => ({
                id: issue.id,
                note: issue.note,
                status: issue.status,
                reportedAt: issue.reportedAt,
                parts: issue.parts,
              })),
              adminNotes: ticket.adminNotes,
              forgottenParts: ticket.forgottenParts,
            }}
          />
        </section>
      ) : null}

      {ticket.status === "SUBMITTED" ? (
        <section
          id="accept"
          className="scroll-mt-20 rounded-3xl bg-warning/10 p-5 sm:p-6"
        >
          <h2 className="font-display text-lg font-extrabold text-warning">
            New repair request
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Sent online by the customer. Accepting asks them to bring the
            device in; mark it received once it is at the shop.
          </p>
          <AcceptTicketForm ticketId={ticket.id} />
        </section>
      ) : null}

      {/* Highlighted straight after booking a repair in: handing this link
          over is the last step of taking in a walk-in device. */}
      {created ? (
        <TrackingLink
          url={link}
          ticketNumber={ticket.ticketNumber}
          className="border-primary/40 bg-primary/[0.04]"
        />
      ) : null}

      {/* ── Customer and money ──────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-extrabold">Customer</h2>
            <ContactEditDialog
              ticketId={ticket.id}
              customerName={ticket.customerName}
              customerPhone={ticket.customerPhone}
              hasAccount={!!ticket.customer}
            />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 font-extrabold text-primary">
              {initials(ownerName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{ownerName}</p>
              <p className="text-sm text-muted-foreground">
                {phone ?? "No phone number yet"}
                {earlierRepairs > 0
                  ? ` · ${earlierRepairs} earlier repair${earlierRepairs === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>
          {ticket.customer?.email ? (
            <a
              href={`mailto:${ticket.customer.email}`}
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Mail className="size-4" /> {ticket.customer.email}
            </a>
          ) : null}
          <ContactButtons
            phone={phone}
            message={fillMessage(shop.msgLink, {
              name: firstName,
              device: deviceName,
              ticket: ticket.ticketNumber,
              link,
              shop: shop.name,
            })}
          />
        </section>

        <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold">Money</h2>
          <dl className="mt-3 space-y-2 text-[15px]">
            <MoneyRow label="Quoted to customer" value={quoted} />
            {billed !== null ? <MoneyRow label="Bill total" value={billed} /> : null}
            {partsList.map((entry, i) => (
              <MoneyRow
                key={`${entry.part}-${i}`}
                label={[entry.part, entry.supplier].filter(Boolean).join(" · ")}
                value={entry.cost ?? null}
              />
            ))}
            {issuePartsCost > 0 ? (
              <MoneyRow
                label="Parts to fix our own mistakes"
                value={issuePartsCost}
                className="text-warning"
              />
            ) : null}
            {partsList.length === 0 && partsCost > 0 ? (
              <MoneyRow label="Parts and costs" value={partsCost} />
            ) : null}
          </dl>
          <dl className="mt-3 space-y-2 border-t border-border pt-3 text-[15px]">
            <MoneyRow
              label={paid !== null ? "Profit" : "Profit if paid in full"}
              value={paid !== null ? paid - partsCost : profit}
              className={
                (paid !== null ? paid - partsCost : (profit ?? 0)) < 0
                  ? "text-destructive"
                  : undefined
              }
            />
            {paid !== null ? <MoneyRow label="Customer paid" value={paid} /> : null}
          </dl>
          {ticket.forgottenParts ? (
            <p className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
              Forgotten parts: {ticket.forgottenParts}
            </p>
          ) : null}
          <Link
            href={editHref}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            Add part or cost
          </Link>
        </section>
      </div>

      {/* ── Everything else ─────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 space-y-4 lg:col-span-3">
          <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold">Timeline</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              The customer sees these notes. Use the pencil to fix one.
            </p>
            <EditableStatusHistory
              updates={ticket.statusUpdates}
              status={ticket.status}
              issues={ticket.issues}
            />
          </section>

          <section className="space-y-4 rounded-3xl bg-card p-5 text-sm sm:p-6">
            <h2 className="font-display text-lg font-extrabold">Repair record</h2>
            <div>
              <p className="text-muted-foreground">Problem</p>
              <p className="mt-0.5 font-semibold">{ticket.issueTitle}</p>
              {ticket.issueDescription ? (
                <p className="mt-1 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {ticket.issueDescription}
                </p>
              ) : null}
            </div>
            {ticket.solution ? (
              <div>
                <p className="text-muted-foreground">Solution</p>
                <p className="mt-0.5 leading-relaxed font-semibold whitespace-pre-wrap">
                  {ticket.solution}
                </p>
              </div>
            ) : null}
            {ticket.duration ? (
              <div>
                <p className="text-muted-foreground">Time taken</p>
                <p className="mt-0.5 font-semibold">{ticket.duration}</p>
              </div>
            ) : null}
            {receivedItems.length > 0 ? (
              <div>
                <p className="text-muted-foreground">Came in with</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {receivedItems.map((item, index) => (
                    <span
                      key={`${item.label}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5"
                    >
                      <span className="font-semibold">{item.label}</span>
                      {item.detail ? (
                        <span className="text-muted-foreground">— {item.detail}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {ticket.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {ticket.photos.map((photo) => (
                  <a
                    key={photo}
                    href={photo}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square overflow-hidden rounded-xl"
                  >
                    <Image
                      src={photo}
                      alt="Device photo"
                      fill
                      sizes="150px"
                      className="object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}
            <div>
              <p className="text-muted-foreground">Notes and lessons (only you see these)</p>
              {ticket.adminNotes ? (
                <div className="mt-1.5">
                  <JournalNote text={ticket.adminNotes} />
                </div>
              ) : (
                <Link
                  href={editHref}
                  className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline"
                >
                  Add a note
                </Link>
              )}
            </div>
          </section>

          {!created ? (
            <TrackingLink url={link} ticketNumber={ticket.ticketNumber} />
          ) : null}
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold">Problem during repair</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Something went wrong on the bench? Report it, and the customer
              chooses a free fix or cancelling with a refund.
            </p>
            <RepairIssuePanel
              ticketId={ticket.id}
              status={ticket.status}
              issues={issuesWithParts}
            />
          </section>

          <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold">Bill notes</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Printed on the bill for the customer.
            </p>
            <BillNotesForm
              ticketId={ticket.id}
              billNotes={ticket.billNotes}
              suggestions={billNoteSuggestions}
            />
          </section>

          {ticket.payments.length > 0 ? (
            <section className="space-y-3 rounded-3xl bg-card p-5 text-sm sm:p-6">
              <h2 className="font-display text-lg font-extrabold">Online payments</h2>
              {ticket.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatLKR(payment.amount.toString())}</p>
                    <p className="text-muted-foreground">
                      {formatDate(payment.createdAt)} · Bank transfer
                    </p>
                  </div>
                  <PaymentBadge status={payment.status} />
                </div>
              ))}
              <Link
                href="/admin/payments"
                className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline"
              >
                Manage in Payments
              </Link>
            </section>
          ) : null}

          <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold">Customer account</h2>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              {ticket.customer
                ? "This repair is linked to the account above."
                : "Link this repair to a customer who has an account."}
            </p>
            <LinkCustomerForm
              ticketId={ticket.id}
              currentCustomerId={ticket.customer?.id ?? null}
              customers={customers}
            />
          </section>
        </div>
      </div>

      {/* Phone: the main action stays in reach at the bottom of the screen. */}
      {!terminal ? (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-card px-4 py-3 md:hidden">
          <MainAction
            ticketId={ticket.id}
            status={ticket.status}
            deviceName={deviceName}
            estimatedCost={estimatedCost}
            tone="primary"
            className="w-full"
          />
        </div>
      ) : null}
    </div>
  );
}

function MoneyRow({
  label,
  value,
  className,
}: {
  label: string;
  value: number | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <dt className={cn("min-w-0", !className && "text-muted-foreground")}>{label}</dt>
      <dd className="shrink-0 font-bold tabular-nums">
        {value !== null ? rupees(value) : "—"}
      </dd>
    </div>
  );
}

// Call, WhatsApp and "send the tracking link" — all need a phone number.
function ContactButtons({ phone, message }: { phone: string | null; message: string }) {
  const chat = phone ? whatsappHref(phone) : null;
  const sendLink = phone ? whatsappHref(phone, message) : null;
  const items = [
    { label: "Call", href: phone ? telHref(phone) : null, icon: Phone, external: false },
    { label: "WhatsApp", href: chat, icon: MessageCircle, external: true },
    { label: "Send link", href: sendLink, icon: Send, external: true },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {items.map(({ label, href, icon: Icon, external }) =>
        href ? (
          <Button key={label} asChild variant="secondary" className="px-2">
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <Icon className="hidden sm:block" /> {label}
            </a>
          </Button>
        ) : (
          <Button
            key={label}
            variant="secondary"
            className="px-2"
            disabled
            title="Add a phone number first"
          >
            {label}
          </Button>
        ),
      )}
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, { label: string; className: string }> = {
    PAID: { label: "Paid", className: "bg-success/15 text-success" },
    PENDING_VERIFICATION: { label: "Under review", className: "bg-warning/15 text-warning" },
    REJECTED: { label: "Rejected", className: "bg-destructive/15 text-destructive" },
  };
  const style = styles[status] ?? { label: status, className: "bg-secondary" };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", style.className)}>
      {style.label}
    </span>
  );
}
