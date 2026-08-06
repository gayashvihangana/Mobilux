import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Who deleted a repair, or moved money. Called from inside the same
// transaction as the mutation it records (where one exists), so a failed
// audit write rolls back the action instead of the action going unlogged.
//
// This is deliberately a thin wrapper, not a framework: every call site
// names its own action string and builds its own meta object, because the
// interesting details differ by action (an amount here, an old value there)
// and guessing a one-size-fits-all shape would just mean re-parsing it later.

export type AuditActor = { id: string; name: string; role: Role };

type AuditClient = { auditLog: Pick<typeof prisma.auditLog, "create"> };

export async function logAudit(
  client: AuditClient,
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: string | null,
  meta?: Prisma.InputJsonValue,
) {
  await client.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      meta: meta ?? undefined,
    },
  });
}

/** Human label for Admin → Activity — falls back to the raw code for anything unmapped. */
export const ACTION_LABELS: Record<string, string> = {
  "ticket.delete": "Deleted a repair",
  "ticket.statusUpdate.delete": "Deleted a timeline entry",
  "bill.markPaid": "Marked a bill paid",
  "bill.markUnpaid": "Marked a bill unpaid",
  "repairIssue.undoDecision": "Reopened an issue decision",
  "repairIssue.withdraw": "Withdrew a reported issue",
  "repairIssue.declined": "Repair cancelled — refund owed",
  "payment.verify": "Verified a payment",
  "payment.reject": "Rejected a payment",
  "discountRule.delete": "Deleted a loyalty tier",
  "product.delete": "Deleted a product",
  "bankAccount.add": "Added a bank account",
  "bankAccount.update": "Updated a bank account",
  "bankAccount.delete": "Deleted a bank account",
  "bankAccount.makePrimary": "Set the default bank account",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/**
 * One-line summary of an entry's meta for the Activity table's Details
 * column. Each action's call site controls what meta actually holds; this
 * just knows how to read the common shapes back out. Anything it doesn't
 * recognise falls back to a compact JSON dump rather than nothing.
 */
export function describeAuditMeta(
  action: string,
  meta: Prisma.JsonValue | null,
): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const m = meta as Record<string, Prisma.JsonValue>;
  const str = (v: Prisma.JsonValue | undefined) =>
    typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;

  switch (action) {
    case "ticket.delete":
      return [str(m.ticketNumber), str(m.deviceName)].filter(Boolean).join(" — ");
    case "ticket.statusUpdate.delete":
      return str(m.ticketNumber) ?? "";
    case "bill.markPaid":
      return [str(m.ticketNumber), str(m.method), str(m.amount) && `LKR ${m.amount}`]
        .filter(Boolean)
        .join(" — ");
    case "bill.markUnpaid":
      return str(m.ticketNumber) ?? "";
    case "repairIssue.undoDecision":
    case "repairIssue.withdraw":
    case "repairIssue.declined":
      return str(m.ticketNumber) ?? "";
    case "payment.verify":
    case "payment.reject":
      return [str(m.label), str(m.amount) && `LKR ${m.amount}`]
        .filter(Boolean)
        .join(" — ");
    case "discountRule.delete":
      return str(m.minRepairs) && str(m.discountPercent)
        ? `${m.minRepairs}+ repairs → ${m.discountPercent}%`
        : "";
    case "product.delete":
      return str(m.name) ?? "";
    case "bankAccount.add":
    case "bankAccount.update":
    case "bankAccount.delete":
    case "bankAccount.makePrimary":
      return [str(m.bankName), str(m.accountNumberLast4) && `····${m.accountNumberLast4}`]
        .filter(Boolean)
        .join(" ");
    default:
      try {
        return JSON.stringify(meta).slice(0, 120);
      } catch {
        return "";
      }
  }
}
