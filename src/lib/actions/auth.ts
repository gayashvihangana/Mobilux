"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  // Set when a correct-credentials login is refused because the account is
  // blocked — the form then offers a "request unblock" button.
  blocked?: boolean;
  blockedEmail?: string;
  unblockRequested?: boolean;
} | null;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+94|0)?[0-9]{9}$/, "Enter a valid Sri Lankan phone number")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, phone, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone: phone || null,
      passwordHash,
    },
  });

  await signIn("credentials", {
    email: normalizedEmail,
    password,
    redirectTo: "/dashboard",
  });

  return null;
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();

  // If the account is blocked, tell the customer directly (only once we've
  // confirmed the password, so we don't reveal which emails are blocked).
  const account = await prisma.user.findUnique({ where: { email } });
  if (account?.blocked) {
    const ok = await bcrypt.compare(parsed.data.password, account.passwordHash);
    if (!ok) return { error: "Invalid email or password." };
    return {
      blocked: true,
      blockedEmail: email,
      unblockRequested: account.unblockRequested,
    };
  }

  const callbackUrl = formData.get("callbackUrl");
  const redirectTo =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/")
      ? callbackUrl
      : "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo,
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

// A blocked customer asks to be unblocked — flags the account and notifies
// every admin. Idempotent: only raises one request/notification until an
// admin acts (block/unblock clears the flag).
export async function requestUnblock(
  email: string,
): Promise<{ ok: boolean; already?: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false };

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user || !user.blocked) return { ok: false };
  if (user.unblockRequested) return { ok: true, already: true };

  await prisma.user.update({
    where: { id: user.id },
    data: { unblockRequested: true },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: `Unblock request from ${user.name}`,
        body: `${user.name} (${user.email}) is blocked and asked to be unblocked.`,
        href: "/admin/customers",
      })),
    });
  }

  return { ok: true };
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
