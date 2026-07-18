import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { auth } from "@/auth";
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
import { formatDate, formatLKR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Repair details",
};

export default async function RepairDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [{ id }, { created }] = await Promise.all([params, searchParams]);

  const ticket = await prisma.repairTicket.findUnique({
    where: { id },
    include: {
      statusUpdates: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!ticket || ticket.customerId !== session.user.id) notFound();

  const deviceLabel =
    DEVICE_TYPES.find((d) => d.value === ticket.deviceType)?.label ?? "Device";

  return (
    <div className="space-y-6">
      <Link
        href="/repairs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All repairs
      </Link>

      {created ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          Repair request submitted! We&apos;ll start the diagnosis shortly — you
          can follow every step right here.
        </div>
      ) : null}

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

      {/* Pipeline stepper */}
      <Card>
        <CardContent className="pt-2 pb-5">
          <StatusStepper status={ticket.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Timeline */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-lg">Repair timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusHistory updates={ticket.statusUpdates} />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Cost */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Cost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated</span>
                <span className="font-medium">
                  {ticket.estimatedCost
                    ? formatLKR(ticket.estimatedCost.toString())
                    : "Pending diagnosis"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Final</span>
                <span className="font-display text-lg font-bold">
                  {ticket.finalCost
                    ? formatLKR(ticket.finalCost.toString())
                    : "—"}
                </span>
              </div>
              {!ticket.finalCost ? (
                <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  The final price is confirmed after diagnosis. Payment options
                  appear here once the repair is complete.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Device details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Device details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{deviceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{ticket.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{ticket.model}</span>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Reported issue</p>
                <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                  {ticket.issueDescription}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          {ticket.photos.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
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
                        sizes="(max-width: 1024px) 45vw, 220px"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
