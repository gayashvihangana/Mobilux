import type { Role } from "@prisma/client";

// Who may do what, in one table.
//
// Before this, authorisation was ~60 copies of `role === "ADMIN"` scattered
// through the server actions. That is fine with two roles and becomes a
// liability with three: adding STAFF meant auditing every one of them, and the
// answer to "can a technician mark a bill paid?" lived in 60 places.
//
// This module is deliberately pure — no Prisma, no server-only — so the edge
// middleware can use it too. It decides nothing about *whether someone is
// signed in*; that is lib/auth-guard's job, and it re-checks the database.

export const PERMISSIONS = [
  // ── Bench ──────────────────────────────────────────────────────────
  /** Log and edit repairs: status, notes, parts, photos, received items. */
  "repair:write",
  /** Report a during-repair issue — the technician owning their own mistake. */
  "repair:issue",
  /**
   * Withdraw a reported issue, record the customer's accept/decline on their
   * behalf, or undo a recorded decision.
   *
   * Deliberately *not* a technician's to do. Reporting a mishap and then
   * withdrawing it would erase the bench-error record that Admin → Errors is
   * built on, and accepting on a customer's behalf can cancel a repair and
   * agree a refund.
   */
  "repair:issue-resolve",
  /** Destroy a repair or a timeline entry. Not recoverable. */
  "repair:delete",

  // ── Counter ────────────────────────────────────────────────────────
  /** Build, issue and re-issue bills; mark them paid or unpaid. */
  "bill:write",
  /** Verify or reject a customer's bank-transfer receipt. */
  "payment:verify",
  /** Storefront catalogue and stock. */
  "product:write",
  /** Storefront orders. */
  "order:write",
  /** Approve, hide or delete customer reviews. */
  "review:moderate",

  // ── The owner's business ───────────────────────────────────────────
  /** Revenue, profit, repair volume, bench-error rates, bench notes. */
  "report:read",
  /** The customer directory — contact details, spend, activity, new accounts. */
  "customer:manage",
  /** Block or unblock a customer's account. */
  "customer:block",
  /** Loyalty discount tiers — this is pricing. */
  "discount:write",
  /** Shop identity, branding and bank accounts. */
  "settings:write",
  /** Create and deactivate staff accounts. */
  "staff:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * What a technician can do: the bench and the counter, and nothing that
 * reveals what the shop earns or changes how it is configured.
 *
 * The reasoning, so it can be argued with rather than guessed at:
 *  - they need billing, because the person handing the device back is the
 *    person taking the money;
 *  - they must not see reports, because margin is the owner's business;
 *  - they must not delete, because "where did that LKR 20,000 repair go?"
 *    has to stay answerable;
 *  - they must not touch settings or bank accounts, because changing where
 *    money is paid is the highest-value attack on a repair shop.
 */
const STAFF_PERMISSIONS = new Set<Permission>([
  "repair:write",
  "repair:issue",
  "bill:write",
  "payment:verify",
  "product:write",
  "order:write",
  "review:moderate",
]);

type Actor = { role: Role } | null | undefined;

/** The single authorisation question. Anonymous and customers get nothing. */
export function can(actor: Actor, action: Permission): boolean {
  if (!actor) return false;
  switch (actor.role) {
    case "ADMIN":
      return true;
    case "STAFF":
      return STAFF_PERMISSIONS.has(action);
    default:
      // CUSTOMER. Customers act on their own records through their own
      // routes, which check ownership rather than a permission.
      return false;
  }
}

/** True for the roles that belong in the back office at all. */
export function isShopStaff(actor: Actor): boolean {
  return actor?.role === "ADMIN" || actor?.role === "STAFF";
}

/** Where an account belongs after signing in. */
export function homePathFor(actor: Actor): string {
  return isShopStaff(actor) ? "/admin" : "/dashboard";
}
