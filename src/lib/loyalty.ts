import type { DiscountRule } from "@prisma/client";

// Highest active rule the customer's completed-repair count qualifies for.
export function discountForCount(
  rules: Pick<DiscountRule, "minRepairs" | "discountPercent" | "active">[],
  completedRepairs: number,
): number {
  const qualifying = rules
    .filter((r) => r.active && completedRepairs >= r.minRepairs)
    .sort((a, b) => b.minRepairs - a.minRepairs);
  return qualifying.length > 0 ? Number(qualifying[0].discountPercent) : 0;
}

export function applyDiscount(amount: number, discountPercent: number) {
  return Math.round(amount * (1 - discountPercent / 100) * 100) / 100;
}
