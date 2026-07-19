import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Inbox,
  Mail,
  NotebookPen,
  Phone,
  Receipt,
  User,
  UserX,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { StatusStepper } from "@/components/status-timeline";
import { EditableStatusHistory } from "./editable-status-history";
import { JournalNote } from "@/components/journal-note";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEVICE_TYPES } from "@/lib/status";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import {
  AcceptTicketForm,
  DeleteTicketDialog,
  LinkCustomerForm,
  StatusUpdateForm,
  TicketDetailsForm,
} from "./ticket-admin-forms";

export const metadata: Metadata = {
  title: "Ticket details",
};

function toDateInput(date: Date | null) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ticket, customers] = await Promise.all([
    prisma.repairTicket.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            completedRepairs: true,
          },
        },
        statusUpdates: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!ticket) notFound();

  const deviceLabel =
    DEVICE_TYPES.find((d) => d.value === ticket.deviceType)?.label ?? "Device";
  const deviceName =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") ||
    `Unknown ${deviceLabel.toLowerCase()}`;
  const ownerName = ticket.customer?.name ?? ticket.customerName ?? "Unknown";

  const paid = ticket.paidAmount ? Number(ticket.paidAmount) : null;
  const parts = ticket.partsCost ? Number(ticket.partsCost) : null;
  const profit =
    paid !== null || parts !== null ? (paid ?? 0) - (parts ?? 0) : null;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All tickets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">
            {ticket.ticketNumber} · {formatDate(ticket.createdAt)}
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {deviceName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {ticket.issueTitle} · {ownerName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={ticket.status} className="px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/bill/${ticket.id}`} target="_blank">
                <Receipt className="size-4" /> View bill
              </Link>
            </Button>
            <DeleteTicketDialog
              ticketId={ticket.id}
              ticketNumber={ticket.ticketNumber}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-2 pb-5">
          <StatusStepper status={ticket.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5">
                <NotebookPen className="size-3.5" />
                Notes & Lessons
                {ticket.adminNotes ? (
                  <span className="ml-0.5 size-1.5 rounded-full bg-warning" />
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
            </TabsList>

            {/* ── Overview ─────────────────────────────────── */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-lg">
                    <Banknote className="size-5 text-primary" /> Money
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Parts cost</p>
                      <p className="font-display mt-1 text-lg font-bold">
                        {parts !== null ? formatLKR(parts) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Customer paid
                      </p>
                      <p className="font-display mt-1 text-lg font-bold">
                        {paid !== null ? formatLKR(paid) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profit</p>
                      <p
                        className={cn(
                          "font-display mt-1 text-lg font-bold",
                          profit !== null && profit > 0 && "text-success",
                          profit !== null && profit < 0 && "text-destructive",
                        )}
                      >
                        {profit !== null ? formatLKR(profit) : "—"}
                      </p>
                    </div>
                  </div>
                  {(ticket.partsUsed ||
                    ticket.partsSupplier ||
                    ticket.duration) && (
                    <>
                      <Separator className="my-4" />
                      <div className="grid gap-3 text-sm sm:grid-cols-3">
                        {ticket.partsUsed ? (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Parts used
                            </p>
                            <p className="mt-0.5 font-medium">
                              {ticket.partsUsed}
                            </p>
                          </div>
                        ) : null}
                        {ticket.partsSupplier ? (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Supplier
                            </p>
                            <p className="mt-0.5 font-medium">
                              {ticket.partsSupplier}
                            </p>
                          </div>
                        ) : null}
                        {ticket.duration ? (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Duration
                            </p>
                            <p className="mt-0.5 font-medium">
                              {ticket.duration}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                  {ticket.forgottenParts ? (
                    <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      Forgotten parts: {ticket.forgottenParts}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-lg">
                    <Wrench className="size-5 text-primary" /> Repair record
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Issue</p>
                    <p className="mt-0.5 font-medium">{ticket.issueTitle}</p>
                    {ticket.issueDescription ? (
                      <p className="mt-1 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {ticket.issueDescription}
                      </p>
                    ) : null}
                  </div>
                  {ticket.solution ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Solution</p>
                      <p className="mt-0.5 leading-relaxed font-medium whitespace-pre-wrap">
                        {ticket.solution}
                      </p>
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
                          className="group relative aspect-square overflow-hidden rounded-xl border border-border"
                        >
                          <Image
                            src={photo}
                            alt="Device photo"
                            fill
                            sizes="150px"
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Timeline</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Notes here are visible to the customer — use the pencil to
                    fix one, or the trash to remove an entry.
                  </p>
                </CardHeader>
                <CardContent>
                  <EditableStatusHistory updates={ticket.statusUpdates} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Notes & Lessons ──────────────────────────── */}
            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-lg">
                    <NotebookPen className="size-5 text-warning" /> Notes &
                    lessons
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Private to you — mistakes, advice to yourself, things you
                    learned on this repair. Never shown to the customer.
                  </p>
                </CardHeader>
                <CardContent>
                  {ticket.adminNotes ? (
                    <JournalNote text={ticket.adminNotes} />
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nothing written yet. Add a note from the Edit tab.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Edit ─────────────────────────────────────── */}
            <TabsContent value="edit" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">
                    Edit repair details
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                      partsUsed: ticket.partsUsed,
                      partsSupplier: ticket.partsSupplier,
                      adminNotes: ticket.adminNotes,
                      forgottenParts: ticket.forgottenParts,
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Awaiting acceptance */}
          {ticket.status === "SUBMITTED" ? (
            <Card className="border-warning/40 bg-warning/5">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg text-warning">
                  <Inbox className="size-5" /> New repair request
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Submitted online by the customer. Accepting confirms the
                  request and asks them to bring the device in — mark it
                  Received once it&apos;s physically at the shop.
                </p>
              </CardHeader>
              <CardContent>
                <AcceptTicketForm ticketId={ticket.id} />
              </CardContent>
            </Card>
          ) : null}

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ticket.customer ? (
                <>
                  <p className="flex items-center gap-2 font-medium">
                    <User className="size-4 text-muted-foreground" />
                    {ticket.customer.name}
                  </p>
                  <a
                    href={`mailto:${ticket.customer.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="size-4" />
                    {ticket.customer.email}
                  </a>
                  {ticket.customer.phone ? (
                    <a
                      href={`tel:${ticket.customer.phone}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-4" />
                      {ticket.customer.phone}
                    </a>
                  ) : null}
                  <p className="text-muted-foreground">
                    {ticket.customer.completedRepairs} completed repair
                    {ticket.customer.completedRepairs === 1 ? "" : "s"} with
                    Mobilux
                  </p>
                </>
              ) : (
                <p className="flex items-center gap-2 font-medium">
                  <UserX className="size-4 text-muted-foreground" />
                  {ticket.customerName ?? "Unknown"}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (no account)
                  </span>
                </p>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Link this repair to a registered account:
              </p>
              <LinkCustomerForm
                ticketId={ticket.id}
                currentCustomerId={ticket.customer?.id ?? null}
                customers={customers}
              />
            </CardContent>
          </Card>

          {/* Status update */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="font-display text-lg">Update status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusUpdateForm
                ticketId={ticket.id}
                currentStatus={ticket.status}
              />
            </CardContent>
          </Card>

          {/* Online payments */}
          {ticket.payments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Online payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {ticket.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium">
                        {formatLKR(payment.amount.toString())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.createdAt)} · Bank transfer
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        payment.status === "PAID" &&
                          "border-success/30 bg-success/15 text-success",
                        payment.status === "PENDING_VERIFICATION" &&
                          "border-warning/30 bg-warning/15 text-warning",
                        payment.status === "REJECTED" &&
                          "border-destructive/30 bg-destructive/15 text-destructive",
                      )}
                    >
                      {payment.status === "PAID"
                        ? "Paid"
                        : payment.status === "PENDING_VERIFICATION"
                          ? "Under review"
                          : payment.status === "REJECTED"
                            ? "Rejected"
                            : payment.status}
                    </span>
                  </div>
                ))}
                <Link
                  href="/admin/payments"
                  className="block text-xs text-primary hover:underline"
                >
                  Manage in Payments →
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
