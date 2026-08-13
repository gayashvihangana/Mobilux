"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { homePathFor, isShopStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { limitByIp, limitByKey, waitMessage } from "@/lib/rate-limit";
import { DEMO_MODE } from "@/lib/config";

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
  // Hiding the "Sign up" link and redirecting /register in middleware.ts is
  // presentation — this is a public HTTP endpoint regardless of what the UI
  // offers, same reasoning as every permission check in lib/auth-guard.ts.
  if (DEMO_MODE) {
    return { error: "New accounts are disabled on this demo. Use one of the sign-in buttons instead." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Stops one address bulk-creating accounts, which would otherwise flood the
  // admin's customer list and the notification bell.
  const throttle = await limitByIp("register");
  if (!throttle.ok) {
    return {
      error: `Too many accounts created from here. Please try again in ${waitMessage(throttle.retryAfter)}.`,
    };
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

// Two entrances, one credential check — and either one signs you in.
//
// `/login` is the customer door and `/staff/login` is the shop's. Keeping them
// apart means the customer site never advertises where the back office is, and
// credential stuffing against a technician's account has to find the entrance
// first. Neither door is a security boundary on its own: both end up in the
// same authorize() and the same database-checked guards.
//
// Which is why using the "wrong" one is not an error. This used to verify the
// password, then refuse and send you to the other page to type it all again —
// friction with no security payoff, since the only person it inconvenienced
// had already proved they owned the account. It made the unadvertised staff
// door a URL every technician had to be told about and remember, when the
// point of hiding it was only ever to keep it off the public site.
//
// So: sign in at whichever door you used, and land wherever your role
// belongs. `/staff/login` still exists for anyone who bookmarks it.
type Entrance = "customer" | "staff";

async function signInAt(
  entrance: Entrance,
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

  // Throttled on both axes: per IP so one machine can't grind through a
  // password list, and per email so a botnet spread across many addresses
  // still can't hammer one known admin account. Checked before any bcrypt
  // work, since each hash is ~250ms of server CPU an attacker would
  // otherwise get to spend for free.
  const [byIp, byEmail] = await Promise.all([
    limitByIp("login"),
    limitByKey("login", email),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    const retry = Math.max(byIp.retryAfter, byEmail.retryAfter);
    return {
      error: `Too many sign-in attempts. Please try again in ${waitMessage(retry)}.`,
    };
  }

  const account = await prisma.user.findUnique({ where: { email } });

  // Everything below only happens once the password checks out, so none of it
  // can be used to discover which addresses have accounts, which are blocked,
  // or which belong to the shop's own staff.
  const passwordOk = account
    ? await bcrypt.compare(parsed.data.password, account.passwordHash)
    : false;

  if (account && passwordOk && account.blocked) {
    // A blocked customer can ask to be let back in. A deactivated
    // technician cannot — that is an employment matter, not a support one.
    return isShopStaff(account)
      ? { error: "This account has been deactivated. Speak to the owner." }
      : {
          blocked: true,
          blockedEmail: email,
          unblockRequested: account.unblockRequested,
        };
  }

  const callbackUrl = formData.get("callbackUrl");
  // Where this account belongs, not which door it knocked on. A technician
  // who signs in at /login is a technician; sending them to /dashboard would
  // only make middleware bounce them to /admin a moment later.
  //
  // Falls back to the door's own default when the credentials are wrong —
  // there is no account to ask, and signIn is about to reject anyway.
  const fallback =
    account && passwordOk
      ? homePathFor(account)
      : entrance === "staff"
        ? "/admin"
        : "/dashboard";
  const redirectTo =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/")
      ? callbackUrl
      : fallback;

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

/** The customer door, at `/login`. */
export async function login(
  prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return signInAt("customer", prev, formData);
}

/** The shop team's door, at `/staff/login`. Unadvertised and noindex. */
export async function staffLogin(
  prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return signInAt("staff", prev, formData);
}

// A blocked customer asks to be unblocked — flags the account and notifies
// every admin. Idempotent: only raises one request/notification until an
// admin acts (block/unblock clears the flag).
export async function requestUnblock(
  email: string,
): Promise<{ ok: boolean; already?: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false };

  // Reachable without signing in and it notifies every admin, so it needs its
  // own ceiling regardless of the idempotency guard below.
  const throttle = await limitByIp("unblock");
  if (!throttle.ok) return { ok: false };

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user || !user.blocked) return { ok: false };
  // Deactivating a technician is an employment decision, not a support
  // ticket. They must not be able to notify every admin about it.
  if (isShopStaff(user)) return { ok: false };
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
