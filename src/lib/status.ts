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

export const STATUS_META: Record<
  TicketStatus,
  { label: string; description: string; className: string; dotClassName: string }
> = {
  SUBMITTED: {
    label: "Submitted",
    description:
      "Submitted online — our team will review and confirm shortly.",
    className: "bg-warning/15 text-warning border-warning/30",
    dotClassName: "bg-warning",
  },
  CONFIRMED: {
    label: "Confirmed",
    description:
      "Request accepted — please bring your device to the shop.",
    className: "bg-primary/15 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
  RECEIVED: {
    label: "Received",
    description: "Your device has been received and logged.",
    className: "bg-info/15 text-info border-info/30",
    dotClassName: "bg-info",
  },
  DIAGNOSING: {
    label: "Diagnosing",
    description: "Our technician is diagnosing the issue.",
    className: "bg-primary/15 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
  AWAITING_PARTS: {
    label: "Awaiting Parts",
    description: "Waiting for replacement parts to arrive.",
    className: "bg-warning/15 text-warning border-warning/30",
    dotClassName: "bg-warning",
  },
  IN_PROGRESS: {
    label: "In Progress",
    description: "Repair work is underway.",
    className: "bg-primary/15 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
  COMPLETED: {
    label: "Completed",
    description: "The repair is complete — ready to collect.",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
  // Legacy status — old tickets may still carry it. Treated as COMPLETED.
  READY_FOR_PICKUP: {
    label: "Ready for Pickup",
    description: "Your device is ready to collect.",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
  PICKED_UP: {
    label: "Picked Up",
    description: "Device collected. Thank you!",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This ticket was cancelled.",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dotClassName: "bg-destructive",
  },
};

// ─── Milestone model ─────────────────────────────────────────────────
// A ticket's `status` = the last COMPLETED milestone. `STATUS_META.label`
// above is the ONGOING/activity name of each step (used for the stepper's
// active blue node and nowhere else that implies completion). The three
// helpers below give the other two forms:
//
//   doneLabel        — the completed name of a milestone. This is what the
//                      customer sees once a step is done: the badge, the
//                      finished stepper nodes, and the timeline entries.
//                      Clicking "Mark as Diagnosed" records DIAGNOSING,
//                      which reads "Diagnosed" everywhere it's shown.
//   pendingLabel     — what the shop is doing / waiting for while the
//                      ticket sits at a status (the note-less top row of
//                      the timeline). null once terminal.
//   milestoneDescription — default body text for a timeline entry that has
//                      no custom note.

const DONE_LABELS: Partial<Record<TicketStatus, string>> = {
  DIAGNOSING: "Diagnosed",
  AWAITING_PARTS: "Parts Arrived",
  IN_PROGRESS: "Repair Started",
};

// Current-activity labels — "what's happening right now" at a given status.
// SHORT is used where space is tight (the stepper's blue node, the status
// pill): just enough to name the activity ("Diagnosing", not "Diagnosing the
// device"). DETAILED is the fuller line the customer reads in the timeline.
const ACTIVITY_SHORT: Partial<Record<TicketStatus, string>> = {
  SUBMITTED: "Confirming",
  CONFIRMED: "Waiting to receive",
  RECEIVED: "Diagnosing",
  DIAGNOSING: "Waiting for parts",
  AWAITING_PARTS: "Waiting to start",
  IN_PROGRESS: "Repairing",
  COMPLETED: "Ready for pickup",
  READY_FOR_PICKUP: "Ready for pickup",
  // PICKED_UP / CANCELLED are terminal — nothing pending.
};

const ACTIVITY_DETAILED: Partial<Record<TicketStatus, string>> = {
  SUBMITTED: "Waiting for the shop to confirm your request",
  CONFIRMED: "Waiting to receive your device",
  RECEIVED: "Diagnosing your device",
  DIAGNOSING: "Waiting for parts to arrive",
  AWAITING_PARTS: "Getting ready to start the repair",
  IN_PROGRESS: "Repairing your device",
  COMPLETED: "Ready for you to collect",
  READY_FOR_PICKUP: "Ready for you to collect",
};

const MILESTONE_DESCRIPTIONS: Record<TicketStatus, string> = {
  SUBMITTED: "Repair request submitted.",
  CONFIRMED: "Request accepted by the shop.",
  RECEIVED: "Device received at the shop.",
  DIAGNOSING: "Diagnosis complete.",
  AWAITING_PARTS: "Replacement parts received.",
  IN_PROGRESS: "Repair work started.",
  COMPLETED: "Your repair is completed and tested.",
  READY_FOR_PICKUP: "Ready to collect.",
  PICKED_UP: "Device collected. Thank you!",
  CANCELLED: "This repair was cancelled.",
};

export function doneLabel(status: TicketStatus): string {
  return DONE_LABELS[status] ?? STATUS_META[status].label;
}

// A natural phrase for a headline like "Your iPhone 13 is <phrase>" — used in
// the notification title and email heading so they read like a sentence.
const STATUS_HEADLINE: Record<TicketStatus, string> = {
  SUBMITTED: "received — pending confirmation",
  CONFIRMED: "confirmed",
  RECEIVED: "received at the shop",
  DIAGNOSING: "diagnosed",
  AWAITING_PARTS: "awaiting parts",
  IN_PROGRESS: "being repaired",
  COMPLETED: "ready for pickup",
  READY_FOR_PICKUP: "ready for pickup",
  PICKED_UP: "collected — thank you!",
  CANCELLED: "cancelled",
};

export function statusHeadline(status: TicketStatus): string {
  return STATUS_HEADLINE[status];
}

// Fuller current-activity line (timeline). Null once terminal.
export function pendingLabel(status: TicketStatus): string | null {
  return ACTIVITY_DETAILED[status] ?? null;
}

// Compact current-activity name — the stepper's blue node and the status
// pill. Falls back to the done label for terminal statuses.
export function currentActivityLabel(status: TicketStatus): string {
  return ACTIVITY_SHORT[status] ?? doneLabel(status);
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
