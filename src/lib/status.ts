import type { DeviceType, OrderStatus, TicketStatus } from "@prisma/client";

export const STATUS_PIPELINE: TicketStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
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
    description: "The repair is complete and tested.",
    className: "bg-success/15 text-success border-success/30",
    dotClassName: "bg-success",
  },
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

const PENDING_LABELS: Partial<Record<TicketStatus, string>> = {
  SUBMITTED: "Waiting for confirmation",
  CONFIRMED: "Waiting to receive the device",
  RECEIVED: "Diagnosing the device",
  DIAGNOSING: "Waiting for parts",
  AWAITING_PARTS: "Waiting to start the repair",
  IN_PROGRESS: "Repair in progress",
  COMPLETED: "Getting ready for pickup",
  READY_FOR_PICKUP: "Waiting for pickup",
  // PICKED_UP / CANCELLED are terminal — nothing pending.
};

const MILESTONE_DESCRIPTIONS: Record<TicketStatus, string> = {
  SUBMITTED: "Repair request submitted.",
  CONFIRMED: "Request accepted by the shop.",
  RECEIVED: "Device received at the shop.",
  DIAGNOSING: "Diagnosis complete.",
  AWAITING_PARTS: "Replacement parts received.",
  IN_PROGRESS: "Repair work started.",
  COMPLETED: "Repair completed and tested.",
  READY_FOR_PICKUP: "Ready to collect.",
  PICKED_UP: "Device collected. Thank you!",
  CANCELLED: "This repair was cancelled.",
};

export function doneLabel(status: TicketStatus): string {
  return DONE_LABELS[status] ?? STATUS_META[status].label;
}

export function pendingLabel(status: TicketStatus): string | null {
  return PENDING_LABELS[status] ?? null;
}

// The single "what's happening right now" label for a status — the current
// activity (what the shop is doing / waiting for). Falls back to the done
// label for terminal statuses (Picked Up, Cancelled) that have no activity.
// This is what the active blue node and the status pill both read from.
export function currentActivityLabel(status: TicketStatus): string {
  return pendingLabel(status) ?? doneLabel(status);
}

export function milestoneDescription(status: TicketStatus): string {
  return MILESTONE_DESCRIPTIONS[status];
}

// Forward/back neighbours in the pipeline (CANCELLED sits outside it).
export function nextStatus(status: TicketStatus): TicketStatus | null {
  const i = STATUS_PIPELINE.indexOf(status);
  if (i === -1 || i === STATUS_PIPELINE.length - 1) return null;
  return STATUS_PIPELINE[i + 1];
}

export function prevStatus(status: TicketStatus): TicketStatus | null {
  const i = STATUS_PIPELINE.indexOf(status);
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
