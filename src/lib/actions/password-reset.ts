"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailConfigured, sendEmail } from "@/lib/email";
import { limitByIp, limitByKey, waitMessage } from "@/lib/rate-limit";
import { getShopInfo } from "@/lib/settings";
import { DEMO_MODE } from "@/lib/config";

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

  // Per IP and per address: without this, anyone can send a victim a reset
  // code every 60 seconds indefinitely and burn the shop's Resend quota
  // doing it. Reported as success so the form still can't be used to probe
  // which addresses have accounts.
  const [byIp, byEmail] = await Promise.all([
    limitByIp("resetRequest"),
    limitByKey("resetRequest", email),
  ]);
  if (!byIp.ok || !byEmail.ok) return { sent: true, email };

  const shop = await getShopInfo();

  if (!emailConfigured()) {
    return {
      error: `Password reset by email isn't set up yet. Please contact us on WhatsApp (${shop.phone}) and we'll reset it for you.`,
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
    subject: `${code} is your ${shop.name} password reset code`,
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
  // Defense in depth: requestPasswordReset() is already inert in demo mode
  // (emailConfigured() is false with no RESEND_API_KEY set, so no code is
  // ever sent), but this closes the completion step too rather than relying
  // on that alone.
  if (DEMO_MODE) {
    return {
      sent: true,
      email: String(formData.get("email") ?? ""),
      error: "Password resets are disabled in the demo.",
    };
  }

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

  // The per-code attempts counter below caps guesses against one code; this
  // caps how fast someone can cycle through codes from a single machine.
  const throttle = await limitByIp("resetSubmit");
  if (!throttle.ok) {
    return failed(
      `Too many attempts. Please try again in ${waitMessage(throttle.retryAfter)}.`,
    );
  }

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
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        // A reset is usually "I've lost control of this account" — so every
        // session opened with the old password ends here.
        sessionsValidFrom: new Date(),
      },
    }),
    prisma.passwordReset.delete({ where: { email } }),
  ]);

  redirect("/login?reset=1");
}
