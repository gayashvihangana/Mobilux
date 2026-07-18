import Link from "next/link";
import { ChevronRight, Laptop, Smartphone, Tablet, Watch, Wrench } from "lucide-react";
import type { DeviceType, TicketStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_PIPELINE } from "@/lib/status";
import { cn, formatDate } from "@/lib/utils";

const deviceIcons: Record<DeviceType, typeof Smartphone> = {
  PHONE: Smartphone,
  TABLET: Tablet,
  LAPTOP: Laptop,
  SMARTWATCH: Watch,
  OTHER: Wrench,
};

export function ticketProgress(status: TicketStatus) {
  if (status === "CANCELLED") return 0;
  const index = STATUS_PIPELINE.indexOf(status);
  return (index + 1) / STATUS_PIPELINE.length;
}

export function TicketCard({
  ticket,
  href,
}: {
  ticket: {
    id: string;
    ticketNumber: string;
    deviceType: DeviceType;
    brand: string | null;
    model: string | null;
    issueTitle: string;
    status: TicketStatus;
    createdAt: Date;
  };
  href: string;
}) {
  const Icon = deviceIcons[ticket.deviceType];
  const progress = ticketProgress(ticket.status);
  const deviceName =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") || "Device";

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10">
            <Icon className="size-5 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{deviceName}</p>
            <p className="truncate text-sm text-muted-foreground">
              {ticket.issueTitle}
            </p>
          </div>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            ticket.status === "CANCELLED" ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{ticket.ticketNumber}</span>
        <span className="flex items-center gap-1">
          {formatDate(ticket.createdAt)}
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
