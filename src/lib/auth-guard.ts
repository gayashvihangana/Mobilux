import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Sessions are stateless JWTs: the role and the account's very existence are
// baked into a cookie at sign-in and nothing on the server can take them back.
// Left alone that means blocking a customer, demoting a technician, deleting
// an account or changing a password has no effect until the token expires.
//
// These helpers re-check the account against the database on every protected
// request. That is one indexed primary-key lookup — far cheaper than the
// queries the pages behind it already run — and it is why "Block" is now an
// immediate control rather than a note about the future.
//
// Middleware cannot do this (it runs on the edge, where Prisma can't), so the
// guard lives in the layouts and server actions, which are Node runtime. The
// middleware check stays as the cheap first pass.

export type GuardedUser = {
  id: string;
  role: Role;
  name: string;
  email: string;
  image: string | null;
};

/**
 * The signed-in account, re-validated against the database.
 * Returns null when the session is absent, the account is gone or blocked, or
 * the token was issued before the account's `sessionsValidFrom` cut-off.
 */
export async function currentUser(): Promise<GuardedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      avatarUrl: true,
      blocked: true,
      sessionsValidFrom: true,
    },
  });
  if (!user || user.blocked) return null;

  // `iat` is seconds since the epoch. Anything minted before the cut-off was
  // issued to a version of this account that no longer has access.
  // Compared at second granularity because that is all `iat` carries — a
  // millisecond-precision timestamp would spuriously reject a token issued in
  // the same second the cut-off was set.
  const issuedAt = session.iat;
  if (
    typeof issuedAt === "number" &&
    issuedAt < Math.floor(user.sessionsValidFrom.getTime() / 1000)
  ) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    image: user.avatarUrl,
  };
}

/** For pages and layouts — sends the caller to the login screen. */
export async function requireUser(): Promise<GuardedUser> {
  const user = await currentUser();
  if (!user) redirect("/login?signedout=1");
  return user;
}

/** For admin pages and layouts. */
export async function requireAdmin(): Promise<GuardedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/**
 * For server actions, which return `{ error }` to a form rather than
 * redirecting. Null means "not signed in, or no longer allowed".
 */
export async function actionUser(): Promise<GuardedUser | null> {
  return currentUser();
}

/** For server actions that are admin-only. */
export async function actionAdmin(): Promise<GuardedUser | null> {
  const user = await currentUser();
  return user?.role === "ADMIN" ? user : null;
}

/**
 * End every existing session for an account. Call whenever access should stop
 * or credentials change — blocking, password change, password reset.
 * Accepts a transaction client so it can join the surrounding write.
 */
export async function revokeSessions(
  client: { user: { update: typeof prisma.user.update } },
  userId: string,
) {
  await client.user.update({
    where: { id: userId },
    data: { sessionsValidFrom: new Date() },
  });
}
