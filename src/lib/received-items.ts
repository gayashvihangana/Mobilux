import type { Prisma } from "@prisma/client";

// What the shop physically took in alongside the repair — logged when the
// admin marks a ticket Received. Stored on RepairTicket.receivedItems as
// JSON: [{ label: "SIM card", detail: "Mobitel" }, …].
export type ReceivedItem = {
  label: string;
  detail?: string;
};

// The choices offered in the Mark-as-Received dialog. Each has a hint for
// its detail field; admins can also add their own items on top.
export const RECEIVED_ITEM_PRESETS: { label: string; placeholder: string }[] = [
  { label: "Phone", placeholder: "e.g. colour, condition, passcode" },
  { label: "Back cover", placeholder: "e.g. black silicone" },
  { label: "SIM card", placeholder: "e.g. Mobitel / Hutch / Dialog" },
  { label: "Tempered glass", placeholder: "e.g. already cracked" },
  { label: "Other accessories", placeholder: "e.g. charger and cable" },
];

// Read the JSON column back into a typed list, tolerating bad/legacy data.
export function parseReceivedItems(value: Prisma.JsonValue | null): ReceivedItem[] {
  if (!Array.isArray(value)) return [];
  const items: ReceivedItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const label = typeof entry.label === "string" ? entry.label : "";
    if (!label) continue;
    const detail =
      typeof entry.detail === "string" && entry.detail ? entry.detail : undefined;
    items.push({ label, detail });
  }
  return items;
}

// One-line summary — the timeline note and notification body when the shop
// doesn't write its own note: "Received: Phone, SIM card (Mobitel)."
export function receivedItemsNote(items: ReceivedItem[]): string | null {
  if (items.length === 0) return null;
  const list = items
    .map((i) => (i.detail ? `${i.label} (${i.detail})` : i.label))
    .join(", ");
  return `Device received at the shop. Received: ${list}.`;
}
