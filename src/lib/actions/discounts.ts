"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { actionAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export type DiscountFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

const ruleSchema = z.object({
  minRepairs: z.coerce
    .number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1 repair"),
  discountPercent: z.coerce
    .number()
    .positive("Discount must be greater than 0")
    .max(100, "Discount can't exceed 100%"),
  active: z.coerce.boolean(),
});

async function requireAdmin() {
  return actionAdmin();
}

function revalidateLoyalty() {
  revalidatePath("/admin/loyalty");
  revalidatePath("/dashboard");
}

export async function createDiscountRule(
  _prev: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const parsed = ruleSchema.safeParse({
    minRepairs: formData.get("minRepairs"),
    discountPercent: formData.get("discountPercent"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.discountRule.create({ data: parsed.data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        error: `A rule for ${parsed.data.minRepairs} repairs already exists.`,
      };
    }
    throw e;
  }

  revalidateLoyalty();
  return { success: true };
}

export async function updateDiscountRule(
  _prev: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing rule id." };

  const parsed = ruleSchema.safeParse({
    minRepairs: formData.get("minRepairs"),
    discountPercent: formData.get("discountPercent"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.discountRule.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        error: `A rule for ${parsed.data.minRepairs} repairs already exists.`,
      };
    }
    throw e;
  }

  revalidateLoyalty();
  return { success: true };
}

export async function toggleDiscountRule(id: string, active: boolean) {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  await prisma.discountRule.update({ where: { id }, data: { active } });
  revalidateLoyalty();
  return { success: true };
}

export async function deleteDiscountRule(
  _prev: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing rule id." };

  await prisma.discountRule.delete({ where: { id } });

  revalidateLoyalty();
  return { success: true };
}
