import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Search, SearchX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/config";
import { getShopInfo } from "@/lib/settings";
import { StatusHistory, StatusStepper } from "@/components/status-timeline";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Track your repair",
  description:
    "Check the live status of your Mobilux repair — enter your ticket number, no sign-in needed.",
};

const DEVICE_LABEL: Record<string, string> = {
  PHONE: "Phone",
  TABLET: "Tablet",
  LAPTOP: "Laptop",
  SMARTWATCH: "Smartwatch",
  OTHER: "Device",
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const query = t?.trim() ?? "";

  const ticket = query
    ? await prisma.repairTicket.findFirst({
        where: { ticketNumber: { equals: query, mode: "insensitive" } },
        select: {
          id: true,
          ticketNumber: true,
          deviceType: true,
          brand: true,
          model: true,
          issueTitle: true,
          status: true,
          createdAt: true,
          completedAt: true,
          statusUpdates: { orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  const deviceName =
    [ticket?.brand, ticket?.model].filter(Boolean).join(" ") ||
    (ticket ? DEVICE_LABEL[ticket.deviceType] : "");

  const shopInfo = ticket ? await getShopInfo() : null;
  const timelineCtx = shopInfo
    ? { deviceName, location: shopInfo.address, hours: shopInfo.hours }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-20">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-widest text-primary uppercase">
          Repair tracker
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Where is my device?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Enter the ticket number from your receipt (e.g.{" "}
          <span className="font-mono text-foreground">REP-044</span>) — no
          sign-in needed.
        </p>
      </div>

      <form action="/track" className="mx-auto mt-8 flex max-w-md gap-2">
        <Input
          type="text"
          name="t"
          defaultValue={query}
          placeholder="REP-044"
          autoComplete="off"
          className="h-11 font-mono uppercase placeholder:normal-case"
          aria-label="Ticket number"
        />
        <Button type="submit" size="lg" className="h-11 shrink-0">
          <Search className="size-4" /> Track
        </Button>
      </form>

      {query && !ticket ? (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-warning/25 bg-warning/10">
            <SearchX className="size-5 text-warning" />
          </span>
          <h2 className="mt-4 font-semibold">
            No repair found for &ldquo;{query}&rdquo;
          </h2>
          <p className="mx-auto mt-1 text-sm text-muted-foreground">
            Double-check the ticket number on your receipt, or message us and
            we&apos;ll find it for you.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <a
              href={whatsappLink(
                `Hi Mobilux! I can't find my repair ticket "${query}" on the tracker. Can you help?`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
          </Button>
        </div>
      ) : null}

      {ticket ? (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-muted-foreground">
                  {ticket.ticketNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {deviceName} — {ticket.issueTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Received {formatDate(ticket.createdAt)}
                  {ticket.completedAt
                    ? ` · Completed ${formatDate(ticket.completedAt)}`
                    : ""}
                </p>
              </div>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-6">
              <StatusStepper status={ticket.status} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              Progress updates
            </h3>
            <div className="mt-5">
              <StatusHistory
                updates={ticket.statusUpdates}
                status={ticket.status}
                ctx={timelineCtx}
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row">
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              Questions about this repair? Message us — we reply fast.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={whatsappLink(
                    `Hi Mobilux! I have a question about my repair ${ticket.ticketNumber}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" /> WhatsApp us
                </a>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">Sign in for full details</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
