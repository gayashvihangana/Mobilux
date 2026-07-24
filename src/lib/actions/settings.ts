"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import {
  SHOP_BANK_ACCOUNTS_KEY,
  getShopBankAccounts,
  setSetting,
  type BankAccount,
} from "@/lib/settings";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

function revalidateSettings() {
  revalidatePath("/admin/settings");
  // Bills read the default account, so refresh anywhere it might show.
  revalidatePath("/admin/tickets", "layout");
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

function normalize(data: z.infer<typeof accountSchema>): Omit<BankAccount, "id"> {
  return {
    bankName: data.bankName,
    branch: data.branch || "",
    accountName: data.accountName,
    accountNumber: data.accountNumber,
  };
}
