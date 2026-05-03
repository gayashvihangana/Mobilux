export function formatLkr(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}
