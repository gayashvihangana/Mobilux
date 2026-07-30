import type { Prisma, TestimonialStatus } from "@prisma/client";
import { DEVICE_TYPES } from "@/lib/status";

export const MESSAGE_MAX = 600;
export const MESSAGE_MIN = 20;

// What lands on the home page, in the order it's shown: featured first,
// then the admin's manual order, newest last-resort tiebreak.
export const APPROVED_ORDER: Prisma.TestimonialOrderByWithRelationInput[] = [
  { featured: "desc" },
  { sortOrder: "asc" },
  { createdAt: "desc" },
];

export const TESTIMONIAL_STATUS_LABEL: Record<TestimonialStatus, string> = {
  PENDING: "Awaiting review",
  APPROVED: "Published",
  HIDDEN: "Hidden",
};

// The caption under the author's name on the home page — the device that was
// repaired plus what was done to it, e.g. "iPhone 13 · Screen replacement".
export function deviceLabelFor(ticket: {
  deviceType: string;
  brand: string | null;
  model: string | null;
  issueTitle: string;
}): string {
  const device =
    [ticket.brand, ticket.model].filter(Boolean).join(" ") ||
    DEVICE_TYPES.find((d) => d.value === ticket.deviceType)?.label ||
    "Device";
  return `${device} · ${ticket.issueTitle}`;
}

// Two-letter monogram used when the author has no avatar.
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ""))
    .toUpperCase();
}

// Shorten "Gayash Vihangana" to "Gayash V." — offered as the default display
// name so customers aren't publishing their full name without meaning to.
export function shortDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}
