import { prisma } from "@/lib/prisma";
import { BANK_DETAILS } from "@/lib/config";

export const PHONES_VISIBLE_KEY = "phones_storefront_visible";

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

export async function getShopPayTo(): Promise<ShopPayTo> {
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
