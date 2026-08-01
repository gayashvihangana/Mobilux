"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { updateSession } from "@/auth";
import { actionUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+94|0)?[0-9]{9}$/, "Enter a valid Sri Lankan phone number")
    .optional()
    .or(z.literal("")),
});

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await actionUser();
  if (!user) return { error: "Not signed in." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { error: "Avatar must be an image." };
    }
    const uploaded = await saveUploads([avatar], "avatars", 1);
    if (uploaded.error || !uploaded.urls?.length) {
      return { error: uploaded.error ?? "Could not save the avatar." };
    }
    avatarUrl = uploaded.urls[0];
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
    select: { name: true, avatarUrl: true },
  });

  await updateSession({
    user: { name: updated.name, image: updated.avatarUrl },
  });

  revalidatePath("/profile");
  revalidatePath("/admin/profile");
  revalidatePath("/dashboard");

  return { success: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await actionUser();
  if (!user) return { error: "Not signed in." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!account) return { error: "Account not found." };

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    account.passwordHash,
  );
  if (!valid) {
    return { fieldErrors: { currentPassword: ["Current password is incorrect"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  // Changing a password is how someone reacts to a device being stolen, so it
  // has to end the sessions on that device. sessionsValidFrom invalidates
  // every token issued before now; re-issuing this one keeps the person who
  // just typed their old password correctly signed in. (If the re-issue
  // doesn't carry a fresh timestamp they simply sign in again with the new
  // password — the revocation is what matters.)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, sessionsValidFrom: new Date() },
  });
  await updateSession({ user: { name: user.name } });

  return { success: true };
}
