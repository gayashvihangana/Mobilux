import type { DeviceType, OrderStatus, TicketStatus } from "@prisma/client";

// READY_FOR_PICKUP is deliberately absent: completing the repair IS being
// ready for pickup, so COMPLETED goes straight to PICKED_UP. The enum value
// still exists for legacy tickets and is treated as COMPLETED everywhere.
export const STATUS_PIPELINE: TicketStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "PICKED_UP",
];

// ─── What a status means ─────────────────────────────────────────────
// A ticket's `status` is what is happening to the device RIGHT NOW: a
// DIAGNOSING repair is being diagnosed, an AWAITING_PARTS one is waiting for
// a part. Each status has exactly one name (`label`), and every screen —
// admin, tracker, bill, emails — uses it, so a repair never reads two ways.
//
// Colour carries meaning only: blue while the shop is working on it, amber
// while it waits on something, green once it is ready or done, red for
// cancelled.
export const STATUS_META: Record<
  TicketStatus,
  {
    label: string;
    description: string;
    className: string;
    dotClassName: string;
  }
> = {
  SUBMITTED: {
    label: "Waiting to confirm",
    description: "Sent online — the shop will confirm it shortly.",
    className: "bg-warning/15 text-warning border-warning/30",
    dotClassName: "bg-warning",
  },
  CONFIRMED: {
    label: "Waiting for device",
    description: "Request accepted — please bring your device to the shop.",
    className: "bg-warning/15 text-warning border-warning/30",
    dotClassName: "bg-warning",
  },
  RECEIVED: {
    label: "Received",
    description: "Your device is at the shop, waiting to be checked.",
    className: "bg-primary/15 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
  DIAGNOSING: {
    label: "Diagnosing",
    description: "Finding out exactly what is wrong.",
    className: "bg-primary/15 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
  AWAITING_PARTS: {
    label: "Waiting for parts",
    description: "Waiting for a replacement part to arrive.",
    className: "bg-warning/15 text-warning border-warning/30",
    dotClassName: "bg-warning",
  },
  IN_PROGRESS: {
    label: "Repairing",
    description: "The repair is being done.",
    className: "bg-primary/15 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
  COMPLETED: {
    label: "Ready for pickup",
    description: "Repaired and tested — ready to collect.",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
  // Legacy status — old tickets may still carry it. Treated as COMPLETED.
  READY_FOR_PICKUP: {
    label: "Ready for pickup",
    description: "Repaired and tested — ready to collect.",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
  PICKED_UP: {
    label: "Picked up",
    description: "Device collected. Thank you!",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This repair was cancelled.",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dotClassName: "bg-destructive",
  },
};

/** The one name for a status, used on every screen. */
export function statusLabel(status: TicketStatus): string {
  return STATUS_META[status].label;
}

// The six steps a walk-in repair goes through, as shown on the repair page
// and the tracker. Online requests start earlier (SUBMITTED, CONFIRMED), but
// those are paperwork before the device is in the shop.
export const REPAIR_STEPS: TicketStatus[] = [
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "PICKED_UP",
];

/** Where a status sits in REPAIR_STEPS; -1 before arrival or when cancelled. */
export function repairStepIndex(status: TicketStatus): number {
  return REPAIR_STEPS.indexOf(status === "READY_FOR_PICKUP" ? "COMPLETED" : status);
}

// The button that moves a repair on from each status. "Send price" is a
// small form (price, and whether a part is needed); the rest are one tap.
export const NEXT_STEP_ACTION: Partial<Record<TicketStatus, string>> = {
  SUBMITTED: "Accept request",
  CONFIRMED: "Mark received",
  RECEIVED: "Start diagnosing",
  DIAGNOSING: "Send price",
  AWAITING_PARTS: "Part arrived",
  IN_PROGRESS: "Mark ready",
  COMPLETED: "Picked up",
  READY_FOR_PICKUP: "Picked up",
};

// Default timeline text for a step that has no note of its own: what
// happened when the repair reached that status.
const MILESTONE_DESCRIPTIONS: Record<TicketStatus, string> = {
  SUBMITTED: "Repair request sent online.",
  CONFIRMED: "Request accepted by the shop.",
  RECEIVED: "Device received at the shop.",
  DIAGNOSING: "Started checking the device.",
  AWAITING_PARTS: "Waiting for a replacement part.",
  IN_PROGRESS: "Repair work started.",
  COMPLETED: "Repaired and tested.",
  READY_FOR_PICKUP: "Repaired and tested.",
  PICKED_UP: "Device collected. Thank you!",
  CANCELLED: "This repair was cancelled.",
};

// A natural phrase for a headline like "Your iPhone 13 is <phrase>" — used in
// the notification title and email heading so they read like a sentence.
const STATUS_HEADLINE: Record<TicketStatus, string> = {
  SUBMITTED: "received — waiting to confirm",
  CONFIRMED: "confirmed",
  RECEIVED: "received at the shop",
  DIAGNOSING: "being diagnosed",
  AWAITING_PARTS: "waiting for a part",
  IN_PROGRESS: "being repaired",
  COMPLETED: "ready for pickup",
  READY_FOR_PICKUP: "ready for pickup",
  PICKED_UP: "collected — thank you!",
  CANCELLED: "cancelled",
};

export function statusHeadline(status: TicketStatus): string {
  return STATUS_HEADLINE[status];
}

// Context that lets the pickup-related notes name the device and tell the
// customer where/when to collect. All optional — the text degrades cleanly.
//
// `shopName` is passed in rather than imported: this module is pure so that a
// server action and a page can't produce different copy, and the live name
// lives in the database (getShopInfo). Omitting it drops the sign-off rather
// than printing a stale build-time name.
export type MilestoneContext = {
  deviceName?: string;
  location?: string;
  hours?: string;
  shopName?: string;
};

// Default body text for a timeline entry with no custom note. The pickup
// steps are personalised with the device name and the shop's collection
// details when context is supplied.
export function milestoneDescription(
  status: TicketStatus,
  ctx: MilestoneContext = {},
): string {
  const device = ctx.deviceName?.trim() || "device";
  // Only the READY_FOR_PICKUP "happening now" row carries the full collect
  // instructions — the COMPLETED milestone entry keeps a plain "repair done"
  // note so the two don't repeat the same block of text.
  if (status === "READY_FOR_PICKUP") return pickupNote(ctx);
  if (status === "PICKED_UP") {
    return `Your ${device} has been collected — we hope it feels good as new. It was a pleasure serving you, and we look forward to seeing you again.${thanks(ctx)}`;
  }
  return MILESTONE_DESCRIPTIONS[status];
}

/** " Thank you for choosing <shop>!" — nothing at all when no name is given. */
function thanks(ctx: MilestoneContext): string {
  const name = ctx.shopName?.trim();
  return name ? ` Thank you for choosing ${name}!` : "";
}

// The full "come and collect" message shown on the live pickup row and in
// the completion notification/email — names the device and folds in the
// shop's address and opening hours when available.
export function pickupNote(ctx: MilestoneContext = {}): string {
  const device = ctx.deviceName?.trim() || "device";
  const where = ctx.location?.trim() ? ` at ${ctx.location.trim()}` : " at our shop";
  const when = ctx.hours?.trim()
    ? ` We're open ${ctx.hours.trim()} — please drop by to collect it during these hours.`
    : "";
  return `Your ${device} is ready to collect${where}.${when}${thanks(ctx)}`;
}

// How far along the pipeline a status sits. CANCELLED sits outside it and
// returns -1. Legacy READY_FOR_PICKUP tickets take COMPLETED's place so they
// can still move forward to PICKED_UP or back to IN_PROGRESS.
export function statusRank(status: TicketStatus): number {
  return STATUS_PIPELINE.indexOf(
    status === "READY_FOR_PICKUP" ? "COMPLETED" : status,
  );
}

// Moving to `target` from `current` walks the pipeline backwards — the shop
// is correcting a step it marked too early, not making progress. Both must
// be inside the pipeline: CANCELLED is neither ahead nor behind.
export function isRewind(current: TicketStatus, target: TicketStatus): boolean {
  const from = statusRank(current);
  const to = statusRank(target);
  return from >= 0 && to >= 0 && to < from;
}

const pipelineIndex = statusRank;

export function nextStatus(status: TicketStatus): TicketStatus | null {
  const i = pipelineIndex(status);
  if (i === -1 || i === STATUS_PIPELINE.length - 1) return null;
  return STATUS_PIPELINE[i + 1];
}

export function prevStatus(status: TicketStatus): TicketStatus | null {
  const i = pipelineIndex(status);
  if (i <= 0) return null;
  return STATUS_PIPELINE[i - 1];
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; dotClassName: string }
> = {
  PENDING: {
    label: "Awaiting payment",
    className: "bg-warning/15 text-warning border-warning/30",
    dotClassName: "bg-warning",
  },
  PAID: {
    label: "Paid",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
  FULFILLED: {
    label: "Fulfilled",
    className: "bg-muted text-muted-foreground border-border",
    dotClassName: "bg-muted-foreground",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dotClassName: "bg-destructive",
  },
};

export const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: "PHONE", label: "Phone" },
  { value: "TABLET", label: "Tablet" },
  { value: "LAPTOP", label: "Laptop" },
  { value: "SMARTWATCH", label: "Smartwatch" },
  { value: "OTHER", label: "Other" },
];
