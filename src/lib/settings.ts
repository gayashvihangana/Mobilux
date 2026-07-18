import { prisma } from "@/lib/prisma";

export const PHONES_VISIBLE_KEY = "phones_storefront_visible";

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
