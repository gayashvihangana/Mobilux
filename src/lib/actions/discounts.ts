"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { actionPermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
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

// Loyalty tiers are pricing, so they stay with the owner. Returns the actor
// (not a bare boolean) so callers that need to audit-log can reuse it.
async function allowed() {
  return actionPermission("discount:write");
}

function revalidateLoyalty() {
  revalidatePath("/admin/loyalty");
  revalidatePath("/dashboard");
}

export async function createDiscountRule(
  _prev: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  if (!(await allowed())) return { error: "Not authorized." };

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
  if (!(await allowed())) return { error: "Not authorized." };

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
  if (!(await allowed())) return { error: "Not authorized." };
  await prisma.discountRule.update({ where: { id }, data: { active } });
  revalidateLoyalty();
  return { success: true };
}

export async function deleteDiscountRule(
  _prev: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  const actor = await allowed();
  if (!actor) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing rule id." };

  const rule = await prisma.discountRule.findUnique({ where: { id } });
  if (!rule) return { error: "Rule not found." };

  await prisma.$transaction(async (tx) => {
    await tx.discountRule.delete({ where: { id } });
    await logAudit(tx, actor, "discountRule.delete", "DiscountRule", id, {
      minRepairs: rule.minRepairs,
      discountPercent: Number(rule.discountPercent),
    });
  });

  revalidateLoyalty();
  return { success: true };
}
