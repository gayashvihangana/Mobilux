"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { actionPermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";
import {
  SHOP_BANK_ACCOUNTS_KEY,
  SHOP_INFO_KEYS,
  SHOP_INFO_TAG,
  getShopBankAccounts,
  normalizeHue,
  parseWeekHours,
  setSetting,
  weekHoursSummary,
  type BankAccount,
} from "@/lib/settings";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

// Changing where money is paid is the highest-value attack on a repair shop.
// Returns the actor (not a bare boolean) so callers that need to audit-log
// can reuse it.
async function allowed() {
  return actionPermission("settings:write");
}

// Never log the full account number — the last 4 digits are enough to tell
// entries apart in Admin → Activity without repeating the whole secret there.
function last4(accountNumber: string) {
  return accountNumber.slice(-4);
}

function revalidateSettings() {
  revalidatePath("/admin/settings");
  // Bills read the default account, so refresh anywhere it might show.
  revalidatePath("/admin/tickets", "layout");
}

// The shop's identity is read by the root layout, so it is cached across
// requests (lib/settings.ts). Dropping the tag is what makes a rename show up
// in the header, footer, browser tab, emails and bills without a redeploy —
// revalidatePath alone would not clear it.
function revalidateShopIdentity() {
  revalidateTag(SHOP_INFO_TAG);
  revalidatePath("/", "layout");
}

async function persistAccounts(accounts: BankAccount[]) {
  await setSetting(SHOP_BANK_ACCOUNTS_KEY, JSON.stringify(accounts));
  revalidateSettings();
}

const accountSchema = z.object({
  bankName: z.string().trim().min(1, "Bank name is required").max(120),
  branch: z.string().trim().max(120).optional().or(z.literal("")),
  accountName: z.string().trim().min(1, "Account name is required").max(120),
  accountNumber: z.string().trim().min(1, "Account number is required").max(60),
});

function parseAccount(formData: FormData) {
  return accountSchema.safeParse({
    bankName: formData.get("bankName") ?? "",
    branch: formData.get("branch") ?? "",
    accountName: formData.get("accountName") ?? "",
    accountNumber: formData.get("accountNumber") ?? "",
  });
}

export async function addBankAccount(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await allowed();
  if (!actor) return { error: "Not authorized." };

  const parsed = parseAccount(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const account = { id: crypto.randomUUID(), ...normalize(parsed.data) };
  const accounts = await getShopBankAccounts();
  accounts.push(account);
  await persistAccounts(accounts);
  await logAudit(prisma, actor, "bankAccount.add", "BankAccount", account.id, {
    bankName: account.bankName,
    accountNumberLast4: last4(account.accountNumber),
  });
  return { success: true };
}

export async function updateBankAccount(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await allowed();
  if (!actor) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Account not found." };

  const parsed = parseAccount(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const accounts = await getShopBankAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return { error: "Account not found." };

  accounts[idx] = { id: accounts[idx].id, ...normalize(parsed.data) };
  await persistAccounts(accounts);
  await logAudit(prisma, actor, "bankAccount.update", "BankAccount", id, {
    bankName: accounts[idx].bankName,
    accountNumberLast4: last4(accounts[idx].accountNumber),
  });
  return { success: true };
}

export async function deleteBankAccount(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await allowed();
  if (!actor) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Account not found." };

  const accounts = await getShopBankAccounts();
  if (accounts.length <= 1) {
    return { error: "Keep at least one account — it's used on bills." };
  }
  const removed = accounts.find((a) => a.id === id);
  const next = accounts.filter((a) => a.id !== id);
  if (next.length === accounts.length) return { error: "Account not found." };

  await persistAccounts(next);
  await logAudit(prisma, actor, "bankAccount.delete", "BankAccount", id, {
    bankName: removed?.bankName ?? null,
    accountNumberLast4: removed ? last4(removed.accountNumber) : null,
  });
  return { success: true };
}

// Move an account to the front of the list so it becomes the default shown
// on new bills.
export async function makePrimaryBankAccount(
  id: string,
): Promise<SettingsFormState> {
  const actor = await allowed();
  if (!actor) return { error: "Not authorized." };

  const accounts = await getShopBankAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) return { error: "Account not found." };

  const reordered = [target, ...accounts.filter((a) => a.id !== id)];
  await persistAccounts(reordered);
  await logAudit(prisma, actor, "bankAccount.makePrimary", "BankAccount", id, {
    bankName: target.bankName,
    accountNumberLast4: last4(target.accountNumber),
  });
  return { success: true };
}

// A logo mark is one emoji, not a sentence. Counting by code points rather
// than UTF-16 units so a single flag or skin-toned emoji isn't rejected for
// being "too long".
const emojiSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || [...v].length <= 4, "Use a single emoji");

// Each field the Settings page can send, with its check. A section sends only
// its own fields, and only fields that arrive are written — so saving the
// Repairs section can never blank the shop's name.
const optionalText = (max: number) => z.string().trim().max(max);

const FIELD_SCHEMAS = {
  name: z.string().trim().min(1, "Shop name is required").max(120),
  tagline: optionalText(120),
  phone: optionalText(60),
  email: optionalText(120),
  address: optionalText(200),
  // Stored digits-only so wa.me links can't be built from "+94 71 234 5678".
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => v === "" || (v.length >= 8 && v.length <= 15),
      "Enter the number with its country code, digits only",
    ),
  logoEmoji: emojiSchema,
  accentHue: z.coerce.number().refine(Number.isFinite, "Pick a brand colour"),
  weekHours: z.string().max(2000),
  warrantyDays: z.coerce
    .number()
    .int("Whole days only")
    .min(0, "0 or more")
    .max(3650, "That is more than ten years"),
  markupPercent: z.coerce
    .number()
    .min(0, "0 or more")
    .max(1000, "That is more than 1000%"),
  ticketPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, "2 to 6 letters, e.g. REP"),
  commonProblems: optionalText(2000),
  billMessage: optionalText(300),
  msgReady: optionalText(1000),
  msgLink: optionalText(1000),
} as const;

type Field = keyof typeof FIELD_SCHEMAS;

export async function saveSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!(await allowed())) return { error: "Not authorized." };

  const values: Partial<Record<Field, string>> = {};
  const fieldErrors: Record<string, string[]> = {};
  for (const field of Object.keys(FIELD_SCHEMAS) as Field[]) {
    if (!formData.has(field)) continue;
    const parsed = FIELD_SCHEMAS[field].safeParse(formData.get(field) ?? "");
    if (!parsed.success) {
      fieldErrors[field] = parsed.error.issues.map((i) => i.message);
      continue;
    }
    values[field] = String(parsed.data ?? "");
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const writes: Promise<unknown>[] = [];
  const write = (key: string, value: string) => writes.push(setSetting(key, value));

  for (const field of Object.keys(values) as Field[]) {
    const value = values[field] as string;
    if (field === "accentHue") {
      write(SHOP_INFO_KEYS.accentHue, String(normalizeHue(value)));
    } else if (field === "weekHours") {
      // Saved per day, and as the one-line summary every bill, message and
      // page already reads.
      const week = parseWeekHours(value);
      write(SHOP_INFO_KEYS.weekHours, JSON.stringify(week));
      write(SHOP_INFO_KEYS.hours, weekHoursSummary(week));
    } else if (field === "commonProblems") {
      const list = value
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 12);
      write(SHOP_INFO_KEYS.commonProblems, list.join("\n"));
    } else {
      write(SHOP_INFO_KEYS[field], value);
    }
  }

  // Logo image: a new upload replaces the old one, "removeLogo" clears it, and
  // neither present leaves whatever is saved alone.
  if (formData.get("removeLogo") === "1") write(SHOP_INFO_KEYS.logoUrl, "");
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    const { urls, error } = await saveUploads([file], "branding", 1);
    if (error) return { error };
    if (urls?.[0]) write(SHOP_INFO_KEYS.logoUrl, urls[0]);
  }

  await Promise.all(writes);
  revalidateSettings();
  revalidateShopIdentity();
  return { success: true };
}

function normalize(data: z.infer<typeof accountSchema>): Omit<BankAccount, "id"> {
  return {
    bankName: data.bankName,
    branch: data.branch || "",
    accountName: data.accountName,
    accountNumber: data.accountNumber,
  };
}
