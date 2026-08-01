import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Fixed-window rate limiting backed by Postgres.
//
// Redis would be faster, but a shop deploying this should not have to sign up
// for a second service to get brute-force protection — and one repair shop's
// login volume is nowhere near the point where the difference shows. Each
// check is a single atomic INSERT ... ON CONFLICT, so concurrent requests
// cannot race past the limit.

export type LimitResult = {
  ok: boolean;
  /** Seconds until the window resets. 0 when `ok`. */
  retryAfter: number;
};

const OK: LimitResult = { ok: true, retryAfter: 0 };

/**
 * Count one hit against `key`. Returns ok:false once `max` is exceeded
 * inside `windowMs`.
 */
export async function hit(
  key: string,
  max: number,
  windowMs: number,
): Promise<LimitResult> {
  const expires = new Date(Date.now() + windowMs);

  try {
    // One statement, so two simultaneous requests can't both read "count = 4"
    // and both decide they're under a limit of 5. An expired window is reset
    // in the same breath rather than needing a separate cleanup pass.
    const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "expiresAt")
      VALUES (${key}, 1, ${expires})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."expiresAt" < NOW() THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "expiresAt" = CASE
          WHEN "RateLimit"."expiresAt" < NOW() THEN ${expires}
          ELSE "RateLimit"."expiresAt"
        END
      RETURNING "count", "expiresAt"
    `;

    const row = rows[0];
    if (!row) return OK;
    if (row.count <= max) return OK;

    const retryAfter = Math.max(
      1,
      Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000),
    );
    return { ok: false, retryAfter };
  } catch (e) {
    // A limiter that fails closed would lock everyone out of the shop the
    // moment the table is missing or the DB hiccups. Log it and let the
    // request through — the authorisation checks behind this still hold.
    console.error("rate-limit check failed", e);
    return OK;
  }
}

/**
 * Caller's IP address. On Vercel `x-forwarded-for` is set by the platform and
 * cannot be spoofed by the client; behind any other proxy make sure the same
 * is true before trusting it.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

// ── Named policies ───────────────────────────────────────────────────
// Tuned for a shop, not a social network: a real person mistyping their
// password a few times is never affected, a script is stopped in seconds.

export const POLICY = {
  /** Password guessing. Applied per IP and per email address. */
  login: { max: 8, windowMs: 15 * 60_000 },
  /** Account creation from one address. */
  register: { max: 5, windowMs: 60 * 60_000 },
  /** Reset-code requests — the email-bombing and Resend-quota guard. */
  resetRequest: { max: 5, windowMs: 60 * 60_000 },
  /** Reset-code submissions, on top of the per-code attempt counter. */
  resetSubmit: { max: 15, windowMs: 15 * 60_000 },
  /** Unblock requests, which notify every admin. */
  unblock: { max: 3, windowMs: 60 * 60_000 },
  /** Public tracker lookups — generous for a person, useless for a scraper. */
  track: { max: 20, windowMs: 60_000 },
} as const;

/** Convenience: apply a named policy to the caller's IP. */
export async function limitByIp(
  policy: keyof typeof POLICY,
  scope = "",
): Promise<LimitResult> {
  const ip = await clientIp();
  const { max, windowMs } = POLICY[policy];
  return hit(`${policy}:ip:${ip}${scope ? `:${scope}` : ""}`, max, windowMs);
}

/** Convenience: apply a named policy to a specific account/email. */
export async function limitByKey(
  policy: keyof typeof POLICY,
  value: string,
): Promise<LimitResult> {
  const { max, windowMs } = POLICY[policy];
  return hit(`${policy}:key:${value.toLowerCase()}`, max, windowMs);
}

/** Human-readable "try again in …" for a form error. */
export function waitMessage(retryAfter: number): string {
  if (retryAfter <= 90) return `${retryAfter} seconds`;
  const mins = Math.ceil(retryAfter / 60);
  return mins === 1 ? "a minute" : `${mins} minutes`;
}

/**
 * Delete expired counters. Nothing depends on this running — an expired row is
 * reset in place on its next hit — but without it the table accumulates one
 * row per IP seen. Call from a scheduled job, or ignore it at shop scale.
 */
export async function pruneRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
