"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { SHOP_PAYTO_KEYS, setSetting } from "@/lib/settings";

export type SettingsFormState = {
  error?: string;
  success?: boolean;
} | null;

const shopBankSchema = z.object({
  bankName: z.string().trim().max(120),
  branch: z.string().trim().max(120),
  accountName: z.string().trim().max(120),
  accountNumber: z.string().trim().max(60),
});

export async function updateShopBankDetails(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Not authorized." };

  const parsed = shopBankSchema.safeParse({
    bankName: formData.get("bankName") ?? "",
    branch: formData.get("branch") ?? "",
    accountName: formData.get("accountName") ?? "",
    accountNumber: formData.get("accountNumber") ?? "",
  });
  if (!parsed.success) return { error: "Please check the account details." };

  await Promise.all([
    setSetting(SHOP_PAYTO_KEYS.bankName, parsed.data.bankName),
    setSetting(SHOP_PAYTO_KEYS.branch, parsed.data.branch),
    setSetting(SHOP_PAYTO_KEYS.accountName, parsed.data.accountName),
    setSetting(SHOP_PAYTO_KEYS.accountNumber, parsed.data.accountNumber),
  ]);

  revalidatePath("/admin/settings");
  return { success: true };
}
