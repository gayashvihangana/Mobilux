import type { DeviceType, OrderStatus, TicketStatus } from "@prisma/client";

export const STATUS_PIPELINE: TicketStatus[] = [
  "SUBMITTED",
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
