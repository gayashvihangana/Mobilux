"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { actionAdmin } from "@/lib/auth-guard";
import { saveUploads } from "@/lib/uploads";
import {
  SHOP_BANK_ACCOUNTS_KEY,
  SHOP_INFO_KEYS,
  SHOP_INFO_TAG,
  getShopBankAccounts,
  getShopInfo,
  normalizeHue,
  setSetting,
  type BankAccount,
} from "@/lib/settings";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

async function requireAdmin() {
  return !!(await actionAdmin());
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
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const parsed = parseAccount(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const accounts = await getShopBankAccounts();
  accounts.push({ id: crypto.randomUUID(), ...normalize(parsed.data) });
  await persistAccounts(accounts);
  return { success: true };
}

export async function updateBankAccount(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

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
  return { success: true };
}

export async function deleteBankAccount(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Account not found." };

  const accounts = await getShopBankAccounts();
  if (accounts.length <= 1) {
    return { error: "Keep at least one account — it's used on bills." };
  }
  const next = accounts.filter((a) => a.id !== id);
  if (next.length === accounts.length) return { error: "Account not found." };

  await persistAccounts(next);
  return { success: true };
}

// Move an account to the front of the list so it becomes the default shown
// on new bills.
export async function makePrimaryBankAccount(
  id: string,
): Promise<SettingsFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const accounts = await getShopBankAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) return { error: "Account not found." };

  const reordered = [target, ...accounts.filter((a) => a.id !== id)];
  await persistAccounts(reordered);
  return { success: true };
}

// A logo mark is one emoji, not a sentence. Counting by code points rather
// than UTF-16 units so a single flag or skin-toned emoji isn't rejected for
// being "too long".
const emojiSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || [...v].length <= 4, "Use a single emoji");

const shopInfoSchema = z.object({
  name: z.string().trim().min(1, "Shop name is required").max(120),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  email: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  hours: z.string().trim().max(200).optional().or(z.literal("")),
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
  accentHue: z.coerce
    .number()
    .refine(Number.isFinite, "Pick a brand colour"),
});

export async function updateShopInfo(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const parsed = shopInfoSchema.safeParse({
    name: formData.get("name") ?? "",
    tagline: formData.get("tagline") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    hours: formData.get("hours") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    logoEmoji: formData.get("logoEmoji") ?? "",
    accentHue: formData.get("accentHue") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const {
    name,
    tagline,
    phone,
    email,
    address,
    hours,
    whatsapp,
    logoEmoji,
    accentHue,
  } = parsed.data;

  // Logo image: a new upload replaces the old one, "removeLogo" clears it, and
  // neither present means leave whatever is saved alone. Resolved before any
  // write so a failed upload doesn't half-save the form.
  const current = await getShopInfo();
  let logoUrl = current.logoUrl;

  if (formData.get("removeLogo") === "1") {
    logoUrl = "";
  }
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    const { urls, error } = await saveUploads([file], "branding", 1);
    if (error) return { error };
    if (urls?.[0]) logoUrl = urls[0];
  }

  await Promise.all([
    setSetting(SHOP_INFO_KEYS.name, name),
    setSetting(SHOP_INFO_KEYS.tagline, tagline || ""),
    setSetting(SHOP_INFO_KEYS.phone, phone || ""),
    setSetting(SHOP_INFO_KEYS.email, email || ""),
    setSetting(SHOP_INFO_KEYS.address, address || ""),
    setSetting(SHOP_INFO_KEYS.hours, hours || ""),
    setSetting(SHOP_INFO_KEYS.whatsapp, whatsapp),
    setSetting(SHOP_INFO_KEYS.logoEmoji, logoEmoji || ""),
    setSetting(SHOP_INFO_KEYS.logoUrl, logoUrl),
    setSetting(SHOP_INFO_KEYS.accentHue, String(normalizeHue(accentHue))),
  ]);

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
