"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionPermission, revokeSessions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// Technician accounts. Only the owner may touch these: an account that can
// create staff can grant itself anything, so staff:manage is the one
// permission that must never leak to STAFF.

export type StaffFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  /** Shown once, on creation — there is no self-service reset for staff. */
  tempPassword?: string;
} | null;

async function allowed() {
  return actionPermission("staff:manage");
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Enter a valid email address").max(160),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  password: z
    .string()
    .min(10, "Use at least 10 characters — this account can issue bills"),
});

export async function createStaff(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  if (!(await allowed())) return { error: "Not authorized." };

  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, phone, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      error:
        existing.role === "CUSTOMER"
          ? "That email already has a customer account. Use a different work address."
          : "That email already has an account.",
    };
  }

  await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      role: "STAFF",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  revalidatePath("/admin/staff");
  return { success: true, tempPassword: password };
}

/**
 * Turn a technician's access on or off.
 *
 * Deactivating has to bump `sessionsValidFrom`, or the person who just walked
 * out still has a working session on their phone for up to eight hours. That
 * is the whole point of the control.
 */
export async function setStaffActive(
  id: string,
  active: boolean,
): Promise<StaffFormState> {
  const admin = await allowed();
  if (!admin) return { error: "Not authorized." };

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!target || target.role !== "STAFF") {
    return { error: "That isn't a staff account." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { blocked: !active, unblockRequested: false },
    });
    // Ends every session this account already has, on every device.
    if (!active) await revokeSessions(tx, id);
  });

  revalidatePath("/admin/staff");
  return { success: true };
}

const passwordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(10, "Use at least 10 characters"),
});

/**
 * Set a technician's password. Staff accounts have no self-service reset —
 * they may not even have an email the shop controls — so the owner does it
 * and reads out the new one.
 */
export async function resetStaffPassword(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  if (!(await allowed())) return { error: "Not authorized." };

  const parsed = passwordSchema.safeParse({
    id: formData.get("id") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, role: true },
  });
  if (!target || target.role !== "STAFF") {
    return { error: "That isn't a staff account." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { passwordHash },
    });
    // A new password means the old sessions are no longer theirs to keep.
    await revokeSessions(tx, target.id);
  });

  revalidatePath("/admin/staff");
  return { success: true, tempPassword: parsed.data.password };
}
