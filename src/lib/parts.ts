import type { Prisma } from "@prisma/client";

// One part fitted during a repair, with the supplier it came from. A repair
// often needs several parts from different suppliers, so these are rows
// rather than the single "Display, Battery" / one-supplier pair the ticket
// used to hold. Stored on RepairTicket.parts as JSON.
export type PartEntry = {
  part: string;
  supplier?: string;
  /** Internal cost of this part — never printed on the customer's bill. */
  cost?: number;
};

export function parseParts(value: Prisma.JsonValue | null | undefined): PartEntry[] {
  if (!Array.isArray(value)) return [];
  const out: PartEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const part = typeof entry.part === "string" ? entry.part.trim() : "";
    if (!part) continue;
    const supplier =
      typeof entry.supplier === "string" && entry.supplier.trim()
        ? entry.supplier.trim()
        : undefined;
    const cost =
      typeof entry.cost === "number" && Number.isFinite(entry.cost)
        ? entry.cost
        : undefined;
    out.push({ part, supplier, cost });
  }
  return out;
}

// Fall back to the flat legacy columns for repairs logged before the list
// existed (and never edited since).
export function partsWithFallback(
  value: Prisma.JsonValue | null | undefined,
  partsUsed: string | null,
  partsSupplier: string | null,
): PartEntry[] {
  const list = parseParts(value);
  if (list.length > 0) return list;
  const legacy = (partsUsed ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return legacy.map((part) => ({
    part,
    supplier: partsSupplier?.trim() || undefined,
  }));
}

// "Display, Battery" — mirrored into RepairTicket.partsUsed so the legacy
// bill line and older reads stay correct.
export function partsSummary(list: PartEntry[]): string | null {
  const labels = list.map((p) => p.part).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : null;
}

// Distinct suppliers, mirrored into RepairTicket.partsSupplier.
export function suppliersSummary(list: PartEntry[]): string | null {
  const suppliers = [
    ...new Set(list.map((p) => p.supplier?.trim()).filter((s): s is string => !!s)),
  ];
  return suppliers.length > 0 ? suppliers.join(", ") : null;
}

export function partsTotalCost(list: PartEntry[]): number {
  return list.reduce((sum, p) => sum + (p.cost ?? 0), 0);
}

// What fixing our own mistakes on a repair cost in parts — the sum across
// every issue raised on the ticket.
export function issuePartsCostOf(
  issues: { parts: Prisma.JsonValue | null }[],
): number {
  return issues.reduce(
    (sum, issue) => sum + partsTotalCost(parseParts(issue.parts)),
    0,
  );
}
