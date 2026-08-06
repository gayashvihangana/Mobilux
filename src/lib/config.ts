// Shop identity and fallbacks.
//
// Nothing here is a secret — every value below is printed on bills or shown on
// the public site — but it IS shop-specific, so it comes from the environment
// rather than being baked into a repo that ships to more than one shop.
//
// These must be read as literal `process.env.NEXT_PUBLIC_*` expressions:
// Next inlines them at build time only for static member access, and some of
// these values are used by client components (the bill builder). A dynamic
// `process.env[key]` lookup would come back undefined in the browser.
//
// The live values an admin edits under Admin → Settings live in the database
// (see lib/settings.ts). These are only the fallbacks used before a shop has
// saved anything.

export const BANK_DETAILS = {
  bankName: process.env.NEXT_PUBLIC_BANK_NAME || "",
  branch: process.env.NEXT_PUBLIC_BANK_BRANCH || "",
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "",
} as const;

export const SHOP = {
  name: process.env.NEXT_PUBLIC_SHOP_NAME || "Your Shop",
  tagline: process.env.NEXT_PUBLIC_SHOP_TAGLINE || "Fix. Track. Trust.",
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE || "",
  email: process.env.NEXT_PUBLIC_SHOP_EMAIL || "",
  city: process.env.NEXT_PUBLIC_SHOP_CITY || "",
  // Shown on the bill and in the "ready for pickup" message. Editable by
  // admins under Admin → Settings (falls back to this default).
  hours: process.env.NEXT_PUBLIC_SHOP_HOURS || "Mon–Sat, 9:00 AM – 7:00 PM",
  // Digits only, international format — used for wa.me chat links.
  whatsapp: process.env.NEXT_PUBLIC_SHOP_WHATSAPP || "",
} as const;

export const WARRANTY_DAYS = Number(
  process.env.NEXT_PUBLIC_WARRANTY_DAYS || 30,
);

// A short, warm line printed at the foot of every bill. Takes the shop name
// rather than reading SHOP.name, because the live name comes from Settings —
// see lib/settings.ts. The env var still wins when a shop has written its own.
export function billQuote(shopName: string): string {
  return (
    process.env.NEXT_PUBLIC_BILL_QUOTE ||
    `Your device, in trusted hands — thank you for choosing ${shopName}.`
  );
}

// Default warranty terms printed in the bill footer. Kept deliberately plain
// so customers know exactly what the standard warranty does and doesn't cover.
export const WARRANTY_TERMS = `Unless a specific warranty period is stated above, repairs carry a ${WARRANTY_DAYS}-day warranty on the workmanship and parts listed on this bill. The warranty does not cover water or liquid damage, physical or accidental damage, misuse, tampering, or any fault unrelated to the original repair.`;

// Canonical site URL (no trailing slash) for links in emails, QR codes,
// sitemaps and Open Graph tags. A printed bill's QR code is generated from
// this, so getting it wrong sends a shop's customers to somebody else's
// tracker — hence no hardcoded production fallback. On Vercel the project's
// own domain is picked up automatically; set NEXT_PUBLIC_APP_URL to override
// (custom domain, preview environment, self-hosting).
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000")
).replace(/\/$/, "");

// WhatsApp links are built from the number saved in Settings, not from this
// module — see `shopWhatsappLink` in lib/settings.ts. `SHOP.whatsapp` above is
// only the fallback that reader falls back to.
