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
