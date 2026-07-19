// Shop configuration — edit these to match the real business details.

export const BANK_DETAILS = {
  bankName: "Commercial Bank of Ceylon",
  branch: "Colombo 03",
  accountName: "Mobilux Repairs",
  accountNumber: "8001234567",
} as const;

export const SHOP = {
  name: "Mobilux",
  phone: "+94 77 123 4567",
  email: "hello@mobilux.lk",
  city: "Colombo, Sri Lanka",
  // Digits only, international format — used for wa.me chat links.
  whatsapp: "94771234567",
} as const;

export const WARRANTY_DAYS = 30;

// Canonical site URL (no trailing slash) for links in emails, QR codes,
// sitemaps and Open Graph tags.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${SHOP.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
