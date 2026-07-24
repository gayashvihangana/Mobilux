// Shop configuration — edit these to match the real business details.

export const BANK_DETAILS = {
  bankName: "Commercial Bank of Ceylon",
  branch: "Colombo 03",
  accountName: "Mobilux Repairs",
  accountNumber: "8001234567",
} as const;

export const SHOP = {
  name: "Mobilux",
  tagline: "Fix. Track. Trust.",
  phone: "+94 71 949 5825",
  email: "mobiluxlk@gmail.com",
  city: "Colombo, Sri Lanka",
  // Shown on the bill and in the "ready for pickup" message. Editable by
  // admins under Admin → Settings (falls back to this default).
  hours: "Mon–Sat, 9:00 AM – 7:00 PM",
  // Digits only, international format — used for wa.me chat links.
  whatsapp: "94719495825",
} as const;

export const WARRANTY_DAYS = 30;

// A short, warm line printed at the foot of every bill.
export const BILL_QUOTE =
  "Your device, in trusted hands — thank you for choosing Mobilux.";

// Default warranty terms printed in the bill footer. Kept deliberately plain
// so customers know exactly what the standard warranty does and doesn't cover.
export const WARRANTY_TERMS = `Unless a specific warranty period is stated above, repairs carry a ${WARRANTY_DAYS}-day warranty on the workmanship and parts listed on this bill. The warranty does not cover water or liquid damage, physical or accidental damage, misuse, tampering, or any fault unrelated to the original repair.`;

// Canonical site URL (no trailing slash) for links in emails, QR codes,
// sitemaps and Open Graph tags.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${SHOP.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
