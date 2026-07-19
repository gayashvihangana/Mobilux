"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendEmail } from "@/lib/email";
import { SHOP } from "@/lib/config";

export type ResetFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  // Step advanced: code was sent (or account doesn't exist — never revealed)
  sent?: boolean;
  email?: string;
} | null;

const CODE_TTL_MS = 10 * 60 * 1000; // codes expire after 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 request per email per minute
const MAX_ATTEMPTS = 5;

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export async function requestPasswordReset(
  _prev: ResetFormState,
  formData: FormData,
): Promise<ResetFormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { email } = parsed.data;

  if (!emailConfigured()) {
    return {
      error: `Password reset by email isn't set up yet. Please contact us on WhatsApp (${SHOP.phone}) and we'll reset it for you.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  // Always report success so the form can't be used to probe which
  // emails have accounts.
  if (!user) return { sent: true, email };

  const existing = await prisma.passwordReset.findUnique({ where: { email } });
  if (
    existing &&
    Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    // Recently sent — don't send another, just advance to the code step.
    return { sent: true, email };
  }

  const code = String(randomInt(100000, 1000000)); // 6 digits, crypto-random
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.passwordReset.upsert({
    where: { email },
    create: { email, codeHash, expiresAt },
    update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
  });

  const delivered = await sendEmail({
    to: email,
    subject: `${code} is your ${SHOP.name} password reset code`,
    heading: "Reset your password",
    lines: [
      `Hi ${user.name},`,
      `Your one-time code is: ${code}`,
      "It expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password won't change.",
    ],
  });
  if (!delivered) {
    return { error: "We couldn't send the email right now. Please try again in a moment." };
  }

  return { sent: true, email };
}

const resetSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code from the email"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function resetPassword(
  _prev: ResetFormState,
  formData: FormData,
): Promise<ResetFormState> {
  const parsed = resetSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      sent: true,
      email: String(formData.get("email") ?? ""),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const { email, code, newPassword } = parsed.data;
  const failed = (message: string): ResetFormState => ({
    sent: true,
    email,
    error: message,
  });

  const reset = await prisma.passwordReset.findUnique({ where: { email } });
  if (!reset || reset.expiresAt.getTime() < Date.now()) {
    return failed("This code has expired. Request a new one below.");
  }
  if (reset.attempts >= MAX_ATTEMPTS) {
    await prisma.passwordReset.delete({ where: { email } });
    return failed("Too many wrong attempts. Request a new code below.");
  }

  const valid = await bcrypt.compare(code, reset.codeHash);
  if (!valid) {
    await prisma.passwordReset.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return failed("That code isn't right — check the email and try again.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    await prisma.passwordReset.delete({ where: { email } });
    return failed("Account not found.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordReset.delete({ where: { email } }),
  ]);

  redirect("/login?reset=1");
}
