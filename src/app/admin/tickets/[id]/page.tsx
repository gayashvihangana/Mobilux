import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { StatusHistory, StatusStepper } from "@/components/status-timeline";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DEVICE_TYPES } from "@/lib/status";
import { cn, formatDate, formatLKR } from "@/lib/utils";
import { CostsForm, StatusUpdateForm } from "./ticket-admin-forms";

export const metadata: Metadata = {
  title: "Ticket details",
};

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ticket = await prisma.repairTicket.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
          completedRepairs: true,
        },
      },
      statusUpdates: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!ticket) notFound();

  const deviceLabel =
    DEVICE_TYPES.find((d) => d.value === ticket.deviceType)?.label ?? "Device";

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
            {ticket.ticketNumber} · Submitted {formatDate(ticket.createdAt)}
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {ticket.brand} {ticket.model}
          </h1>
          <p className="mt-1 text-muted-foreground">{ticket.issueTitle}</p>
        </div>
        <StatusBadge status={ticket.status} className="px-3 py-1.5 text-sm" />
      </div>

      <Card>
        <CardContent className="pt-2 pb-5">
          <StatusStepper status={ticket.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Issue */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Reported issue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{deviceLabel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Brand</p>
                  <p className="font-medium">{ticket.brand}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium">{ticket.model}</p>
                </div>
              </div>
              <Separator />
              <p className="leading-relaxed whitespace-pre-wrap">
                {ticket.issueDescription}
              </p>
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

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusHistory updates={ticket.statusUpdates} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
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
              <Separator />
              <p className="text-muted-foreground">
                {ticket.customer.completedRepairs} completed repair
                {ticket.customer.completedRepairs === 1 ? "" : "s"} with Mobilux
              </p>
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

          {/* Payments */}
          {ticket.payments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Payments</CardTitle>
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

          {/* Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Costs & notes</CardTitle>
            </CardHeader>
            <CardContent>
              <CostsForm
                ticketId={ticket.id}
                estimatedCost={ticket.estimatedCost?.toString() ?? null}
                finalCost={ticket.finalCost?.toString() ?? null}
                adminNotes={ticket.adminNotes}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
