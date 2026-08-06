import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BANK_DETAILS, SHOP } from "@/lib/config";
import { DEFAULT_BILL_SHOW, resolveBillShow, type BillShow } from "@/lib/bill";

export const PHONES_VISIBLE_KEY = "phones_storefront_visible";

// Whether the home-page testimonial rail is shown. Defaults to on — the
// section hides itself anyway when there is nothing approved to show.
export const TESTIMONIALS_VISIBLE_KEY = "testimonials_section_visible";

// The bill field show/hide choices carried over to the NEXT bill — saved
// every time a bill is generated, so the shop sets its layout once and new
// bills open the same way. A bill that already has its own billShow keeps it.
export const BILL_SHOW_DEFAULT_KEY = "bill_show_default";

export async function getDefaultBillShow(): Promise<BillShow> {
  const raw = await getSetting(BILL_SHOW_DEFAULT_KEY);
  if (!raw) return { ...DEFAULT_BILL_SHOW };
  try {
    return resolveBillShow(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_BILL_SHOW };
  }
}

// ── Shop identity ────────────────────────────────────────────────────
// This is the shop's identity everywhere: header logo, footer, browser tab,
// emails, bills, the public tracker. Editable under Admin → Settings; each
// field falls back to the `NEXT_PUBLIC_SHOP_*` build-time value, which in turn
// falls back to a neutral placeholder.
//
// The env vars exist so a fresh install looks right before an owner has saved
// anything. Once they save, the database wins — with no redeploy.
export const SHOP_INFO_KEYS = {
  name: "shop_name",
  tagline: "shop_tagline",
  phone: "shop_phone",
  email: "shop_email",
  address: "shop_address",
  hours: "shop_hours",
  whatsapp: "shop_whatsapp",
  logoEmoji: "shop_logo_emoji",
  logoUrl: "shop_logo_url",
  accentHue: "shop_accent_hue",
} as const;

export type ShopInfo = {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  /** Digits only, international format. Blank hides every WhatsApp button. */
  whatsapp: string;
  /** A single emoji used as the logo mark when there's no uploaded image. */
  logoEmoji: string;
  /** Uploaded logo image. Takes precedence over the emoji. */
  logoUrl: string;
  /**
   * Brand colour as an OKLCH hue angle, 0–360. Only the hue is configurable:
   * lightness and chroma stay tuned per theme, so an owner cannot pick a
   * colour that fails contrast in dark mode. See DEFAULT_ACCENT_HUE.
   */
  accentHue: number;
};

/** The blue the app ships with — matches `--primary` in globals.css. */
export const DEFAULT_ACCENT_HUE = 262;

/**
 * Named hues offered in Settings. Restricting the choice to a hue angle is
 * what keeps every theme token coherent: the whole palette rotates together
 * and nothing has to be re-checked for contrast.
 */
export const ACCENT_PRESETS = [
  { label: "Blue", hue: 262 },
  { label: "Indigo", hue: 285 },
  { label: "Violet", hue: 310 },
  { label: "Rose", hue: 10 },
  { label: "Amber", hue: 70 },
  { label: "Green", hue: 150 },
  { label: "Teal", hue: 190 },
  { label: "Cyan", hue: 225 },
] as const;

export function normalizeHue(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ACCENT_HUE;
  // Wrap rather than clamp — hue is an angle, so 370 is 10.
  return ((Math.round(n) % 360) + 360) % 360;
}

/** Cache tag for everything derived from the shop-identity settings. */
export const SHOP_INFO_TAG = "shop-info";

// Six settings rows on every render of every page is not acceptable, and this
// is now read by the root layout, the header, the footer, page metadata and
// every email. Two layers:
//
//   unstable_cache — survives across requests, dropped by revalidateTag when
//                    an admin saves (see lib/actions/settings.ts).
//   React cache    — dedupes the repeat calls inside a single render.
const readShopInfo = unstable_cache(
  async (): Promise<ShopInfo> => {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(SHOP_INFO_KEYS) } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      name: map.get(SHOP_INFO_KEYS.name) || SHOP.name,
      tagline: map.get(SHOP_INFO_KEYS.tagline) || SHOP.tagline,
      phone: map.get(SHOP_INFO_KEYS.phone) || SHOP.phone,
      email: map.get(SHOP_INFO_KEYS.email) || SHOP.email,
      address: map.get(SHOP_INFO_KEYS.address) || SHOP.city,
      hours: map.get(SHOP_INFO_KEYS.hours) || SHOP.hours,
      whatsapp: (
        map.get(SHOP_INFO_KEYS.whatsapp) ?? SHOP.whatsapp
      ).replace(/\D/g, ""),
      logoEmoji: map.get(SHOP_INFO_KEYS.logoEmoji) || "",
      logoUrl: map.get(SHOP_INFO_KEYS.logoUrl) || "",
      accentHue: normalizeHue(
        map.get(SHOP_INFO_KEYS.accentHue) || DEFAULT_ACCENT_HUE,
      ),
    };
  },
  ["shop-info"],
  { tags: [SHOP_INFO_TAG] },
);

export const getShopInfo = cache(readShopInfo);

/**
 * A wa.me link for the shop's saved number, or null when they haven't set one
 * — callers render nothing rather than a button that opens an empty wa.me/.
 */
export function shopWhatsappLink(
  shop: Pick<ShopInfo, "whatsapp">,
  message?: string,
): string | null {
  if (!shop.whatsapp) return null;
  const base = `https://wa.me/${shop.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Shop bank details — the default "pay to" account shown on unpaid bills.
// Editable by admins under Admin → Settings; falls back to config defaults.
export const SHOP_PAYTO_KEYS = {
  bankName: "shop_bank_name",
  branch: "shop_bank_branch",
  accountName: "shop_account_name",
  accountNumber: "shop_account_number",
} as const;

export type ShopPayTo = {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
};

// Full list of the shop's bank accounts. Stored as a JSON array under a
// single setting key; the first account is the default shown on bills.
export const SHOP_BANK_ACCOUNTS_KEY = "shop_bank_accounts";

export type BankAccount = ShopPayTo & { id: string };

// The legacy single-account keys, used as the seed for the accounts list the
// first time an admin hasn't saved any accounts yet (and as the ultimate
// fallback to the config defaults).
async function getLegacyPayTo(): Promise<ShopPayTo> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(SHOP_PAYTO_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    bankName: map.get(SHOP_PAYTO_KEYS.bankName) || BANK_DETAILS.bankName,
    branch: map.get(SHOP_PAYTO_KEYS.branch) || BANK_DETAILS.branch,
    accountName: map.get(SHOP_PAYTO_KEYS.accountName) || BANK_DETAILS.accountName,
    accountNumber:
      map.get(SHOP_PAYTO_KEYS.accountNumber) || BANK_DETAILS.accountNumber,
  };
}

export async function getShopBankAccounts(): Promise<BankAccount[]> {
  const raw = await getSetting(SHOP_BANK_ACCOUNTS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((a) => a && typeof a === "object")
          .map((a) => ({
            id: String(a.id ?? crypto.randomUUID()),
            bankName: String(a.bankName ?? ""),
            branch: String(a.branch ?? ""),
            accountName: String(a.accountName ?? ""),
            accountNumber: String(a.accountNumber ?? ""),
          }));
      }
    } catch {
      // fall through to the legacy default
    }
  }
  const legacy = await getLegacyPayTo();
  return [{ id: "default", ...legacy }];
}

// The default "pay to" account used on bills — the first account in the list.
export async function getShopPayTo(): Promise<ShopPayTo> {
  const [primary] = await getShopBankAccounts();
  const { bankName, branch, accountName, accountNumber } = primary;
  return { bankName, branch, accountName, accountNumber };
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function phonesVisible(): Promise<boolean> {
  return (await getSetting(PHONES_VISIBLE_KEY)) === "true";
}

// Unlike phones, this one is opt-out: only an explicit "false" hides it.
export async function testimonialsVisible(): Promise<boolean> {
  return (await getSetting(TESTIMONIALS_VISIBLE_KEY)) !== "false";
}
