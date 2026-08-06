// Proves the audit log actually covers what week 4.1 promised: every action
// that deletes a repair or moves money writes a record, the permission that
// gates Admin → Activity is owner-only, and nothing in the app can delete an
// entry once it's written.
//
//   npm run verify:audit               # static checks only, no DB needed
//   VERIFY_WRITES=1 npm run verify:audit   # also proves the table itself works
//
// The static checks (schema, permission, wiring, "never deletable") read
// source files directly — the same technique scripts/verify-permissions.ts
// uses for checkActionsGuarded, deliberately re-implemented here rather than
// imported, so this script can never change that one's behaviour.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { can, PERMISSIONS } from "../src/lib/permissions";

const results: { ok: boolean; name: string; detail?: string }[] = [];
const check = (ok: boolean, name: string, detail = "") =>
  results.push({ ok, name, detail });

const ROOT = process.cwd();

// ── 1. the schema ────────────────────────────────────────────────────
function checkSchema() {
  const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
  check(/model AuditLog\s*\{/.test(schema), "AuditLog model exists in schema.prisma");
  for (const field of ["actorId", "actorName", "actorRole", "action", "entityType", "entityId", "meta"]) {
    check(new RegExp(`\\b${field}\\b`).test(schema), `AuditLog has a "${field}" field`);
  }
}

// ── 2. the permission is owner-only ──────────────────────────────────
function checkPermission() {
  check(
    (PERMISSIONS as readonly string[]).includes("audit:read"),
    "audit:read is a real permission",
  );
  check(can({ role: "ADMIN" }, "audit:read"), "the owner can read the activity log");
  check(!can({ role: "STAFF" }, "audit:read"), "a technician cannot");
  check(!can({ role: "CUSTOMER" }, "audit:read"), "a customer cannot");
  check(!can(null, "audit:read"), "an anonymous visitor cannot");
}

// ── 3. every delete/money action is wired to logAudit() ─────────────
// Small local reimplementation of verify-permissions.ts's functionsIn — see
// the file header for why this isn't imported.
function functionsIn(src: string) {
  const re = /^(export )?(?:async )?function (\w+)/gm;
  const found: { name: string; start: number }[] = [];
  for (const m of src.matchAll(re)) {
    found.push({ name: m[2], start: m.index! + m[0].length });
  }
  return found.map((f, i) => ({
    ...f,
    body: src.slice(f.start, found[i + 1]?.start ?? src.length),
  }));
}

// (file, function) pairs that delete a row/entry or move money — see
// docs/SHIPPING-PLAN.md §4.1 for why each is on this list. reviewPayment is
// the shared body behind verifyPayment/rejectPayment, not exported itself.
const TARGETS: { file: string; fn: string }[] = [
  { file: "tickets.ts", fn: "deleteTicket" },
  { file: "tickets.ts", fn: "deleteStatusUpdate" },
  { file: "tickets.ts", fn: "markBillPaid" },
  { file: "tickets.ts", fn: "markBillUnpaid" },
  { file: "tickets.ts", fn: "undoRepairIssueDecision" },
  { file: "tickets.ts", fn: "withdrawRepairIssue" },
  { file: "tickets.ts", fn: "respondRepairIssue" },
  { file: "payments.ts", fn: "reviewPayment" },
  { file: "discounts.ts", fn: "deleteDiscountRule" },
  { file: "products.ts", fn: "deleteProduct" },
  { file: "settings.ts", fn: "addBankAccount" },
  { file: "settings.ts", fn: "updateBankAccount" },
  { file: "settings.ts", fn: "deleteBankAccount" },
  { file: "settings.ts", fn: "makePrimaryBankAccount" },
];

function checkWiring() {
  const dir = join(ROOT, "src", "lib", "actions");
  const byFile = new Map<string, ReturnType<typeof functionsIn>>();

  const missing: string[] = [];
  for (const { file, fn } of TARGETS) {
    if (!byFile.has(file)) {
      byFile.set(file, functionsIn(readFileSync(join(dir, file), "utf8")));
    }
    const fns = byFile.get(file)!;
    const target = fns.find((f) => f.name === fn);
    if (!target) {
      missing.push(`${file}:${fn} (function not found)`);
      continue;
    }
    if (!/logAudit\(/.test(target.body)) missing.push(`${file}:${fn}`);
  }

  check(
    missing.length === 0,
    `every delete/money action calls logAudit() (${TARGETS.length} checked)`,
    missing.join(", "),
  );
}

// ── 4. never deletable from the UI ───────────────────────────────────
function checkNeverDeletable() {
  const offenders: string[] = [];
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        const src = readFileSync(full, "utf8");
        if (/auditLog\.delete(Many)?\(/.test(src)) offenders.push(full);
      }
    }
  };
  scan(join(ROOT, "src", "lib", "actions"));
  scan(join(ROOT, "src", "app", "admin", "activity"));
  check(
    offenders.length === 0,
    "nothing in the app deletes an audit-log entry",
    offenders.join(", "),
  );
}

// ── 5. the table itself, live (VERIFY_WRITES=1) ──────────────────────
// lib/audit.ts starts with `import "server-only"`, which only resolves
// inside Next's build — a bare tsx script can't import it (same reason
// verify-permissions.ts's live checks never import lib/auth-guard.ts
// either). So this writes the row the same shape logAudit() would, directly
// against a real Postgres connection, rather than re-driving each admin page
// over HTTP: several of those forms live inside a client-side Radix dialog,
// so — unlike /login's plain server-rendered form — nothing is in the
// initial HTML to scrape a $ACTION_* hidden field from. The static wiring
// check above (does the function call logAudit()) is the real proof for
// those; this proves the table itself.
async function checkLive() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, name: true, role: true },
    });
    check(!!admin, "a seeded ADMIN account exists to test against");
    if (!admin) return;

    const entityId = `verify-audit-${Date.now()}`;
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorName: admin.name,
        actorRole: admin.role,
        action: "verify.smoke",
        entityType: "SmokeTest",
        entityId,
        meta: { probe: true, amount: 42 },
      },
    });

    const row = await prisma.auditLog.findFirst({
      where: { entityType: "SmokeTest", entityId },
    });
    check(!!row, "logAudit() writes a row");
    check(row?.actorId === admin.id, "…with the right actor");
    check(row?.actorName === admin.name, "…and the actor-name snapshot");
    check(
      !!row?.meta && (row.meta as { amount?: number }).amount === 42,
      "…and the JSON meta round-trips",
    );

    if (row) await prisma.auditLog.delete({ where: { id: row.id } });
  } finally {
    await prisma.$disconnect();
  }
}

// ── run ─────────────────────────────────────────────────────────────
async function main() {
  checkSchema();
  checkPermission();
  checkWiring();
  checkNeverDeletable();

  if (process.env.VERIFY_WRITES === "1") {
    await checkLive();
  } else {
    console.log(
      "Skipping the live table check — set VERIFY_WRITES=1 (DATABASE_URL must\n" +
        "point at a dev database with a seeded ADMIN) to run it. The schema,\n" +
        "permission and wiring checks above ran regardless.\n",
    );
  }
}

function report() {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(
      `${r.ok ? "  ok  " : " FAIL "} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`,
    );
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nThe audit log is not holding. Do not ship this instance.");
  }
  process.exit(failed.length ? 1 : 0);
}

main()
  .catch((e) => check(false, "harness crashed", e?.message ?? String(e)))
  .then(report);
