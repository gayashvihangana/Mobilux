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

// A few statuses describe an ongoing activity ("Diagnosing") rather than
// a point-in-time checkpoint ("Received"). Once that activity is behind
// us — a ticked step on the stepper, or a past entry in the timeline —
// showing the ongoing form reads as if it's still happening. These are
// the completed-form overrides for those cases; anything not listed
// here already reads correctly in both tenses.
const DONE_OVERRIDES: Partial<Record<TicketStatus, { label: string; description: string }>> = {
  DIAGNOSING: { label: "Diagnosed", description: "Diagnosis complete." },
  AWAITING_PARTS: {
    label: "Parts Arrived",
    description: "Replacement parts have arrived.",
  },
  IN_PROGRESS: { label: "Repaired", description: "Repair work is complete." },
};

// Statuses that describe something actively happening, as opposed to a
// checkpoint just reached. Being "at" one of these means the work is
// still underway, not finished — the stepper treats them differently
// from milestone statuses when deciding what counts as done.
export const ONGOING_TICKET_STATUSES: TicketStatus[] = [
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
];

export function doneLabel(status: TicketStatus): string {
  return DONE_OVERRIDES[status]?.label ?? STATUS_META[status].label;
}

export function doneDescription(status: TicketStatus): string {
  return DONE_OVERRIDES[status]?.description ?? STATUS_META[status].description;
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
