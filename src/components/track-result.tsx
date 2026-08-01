import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { SHOP, WHATSAPP_ENABLED, whatsappLink } from "@/lib/config";
import { getShopInfo } from "@/lib/settings";
import type { PublicTicket } from "@/lib/track";
import { StatusHistory, StatusStepper } from "@/components/status-timeline";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const DEVICE_LABEL: Record<string, string> = {
  PHONE: "Phone",
  TABLET: "Tablet",
  LAPTOP: "Laptop",
  SMARTWATCH: "Smartwatch",
  OTHER: "Device",
};

// The signed-out view of a repair, shared by the tracking link and the
// ticket-number lookup. Everything it renders comes from lib/track's
// deliberately narrow select, and the timeline runs in `publicView` so the
// shop's internal notes and handover photos stay out of it.
export async function TrackResult({ ticket }: { ticket: PublicTicket }) {
  const deviceName =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") ||
    DEVICE_LABEL[ticket.deviceType];

  const shopInfo = await getShopInfo();
  const timelineCtx = {
    deviceName,
    location: shopInfo.address,
    hours: shopInfo.hours,
  };

  const issuePending = ticket.issues.some((i) => i.status === "PENDING");

  return (
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
          <StatusStepper
            status={ticket.status}
            cancelledFrom={
              ticket.statusUpdates.find((u) => u.status !== "CANCELLED")
                ?.status ?? null
            }
            issuePending={issuePending}
          />
        </div>
      </div>

      {issuePending ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6">
          <h3 className="font-semibold">This repair needs your decision</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Something came up while we were working on your device and we need
            you to choose how to proceed. Sign in to read the details and
            decide, or message us and we&apos;ll talk it through.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/login">Sign in to decide</Link>
            </Button>
            {WHATSAPP_ENABLED ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={whatsappLink(
                    `Hi ${SHOP.name}! I got a message about an issue with my repair ${ticket.ticketNumber}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" /> Message us
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Progress updates
        </h3>
        <div className="mt-5">
          <StatusHistory
            updates={ticket.statusUpdates}
            status={ticket.status}
            ctx={timelineCtx}
            issues={null}
            publicView
          />
        </div>
        <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
          Sign in to see the full notes from our technicians, photos, and your
          bill.
        </p>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          Questions about this repair? Message us — we reply fast.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {WHATSAPP_ENABLED ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={whatsappLink(
                  `Hi ${SHOP.name}! I have a question about my repair ${ticket.ticketNumber}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" /> WhatsApp us
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href="/login">Sign in for full details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
