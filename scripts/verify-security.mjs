// Proves the security controls actually work against a live database and a
// running server, rather than merely typechecking. Run it after an install and
// after any change to auth, the tracker or the rate limiter.
//
//   npm run dev                      # in one terminal
//   npm run verify:security          # in another
//
// It WRITES to the database: it creates a throwaway repair ticket, and it
// blocks/unblocks the test account and moves its sessionsValidFrom. Everything
// is restored in a finally block, but a crash mid-run could leave the test
// account blocked — which is why it refuses to touch a database it wasn't
// explicitly pointed at.
//
// Env:
//   BASE_URL          default http://localhost:3000
//   VERIFY_EMAIL      a CUSTOMER account it may block and unblock
//   VERIFY_PASSWORD   that account's password
//   VERIFY_WRITES=1   required acknowledgement that this script writes

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VERIFY_EMAIL?.toLowerCase();
const PASSWORD = process.env.VERIFY_PASSWORD;

if (process.env.VERIFY_WRITES !== "1") {
  console.error(
    "Refusing to run: this script blocks and unblocks a real account and\n" +
      "creates a throwaway ticket. Set VERIFY_WRITES=1 to confirm the\n" +
      "DATABASE_URL you are pointing at is a development or staging database.",
  );
  process.exit(2);
}
if (!EMAIL || !PASSWORD) {
  console.error("Set VERIFY_EMAIL and VERIFY_PASSWORD to a CUSTOMER test account.");
  process.exit(2);
}

const prisma = new PrismaClient();

const results = [];
const check = (ok, name, detail = "") => results.push({ ok, name, detail });

class Jar {
  #c = new Map();
  absorb(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const i = pair.indexOf("=");
      this.#c.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header() { return [...this.#c].map(([k, v]) => `${k}=${v}`).join("; "); }
}

async function req(path, jar, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...opts,
    headers: { cookie: jar?.header() ?? "", ...(opts.headers ?? {}) },
  });
  jar?.absorb(res);
  return res;
}

async function signIn() {
  const jar = new Jar();
  const { csrfToken } = await (await req("/api/auth/csrf", jar)).json();
  await req("/api/auth/callback/credentials", jar, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: `${BASE}/dashboard`,
    }).toString(),
  });
  return jar;
}

/** true when the page rendered, false when the guard bounced us to /login. */
async function reaches(path, jar) {
  const res = await req(path, jar);
  return { ok: res.status === 200, status: res.status, loc: res.headers.get("location") ?? "" };
}

const NOT_FOUND = /couldn&#x27;t find that repair|couldn't find that repair/i;
const CANARY = {
  number: "ZZ-VERIFY-1",
  notes: "VERIFY-ADMIN-NOTE-do-not-leak",
  supplier: "VERIFY-SUPPLIER-Ltd",
  partsCost: 13337,
  finalCost: 44555,
  photo: "/uploads/VERIFY-PHOTO.jpg",
};

let account, ticket, originalPhone;

async function setup() {
  account = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!account) throw new Error(`No account for ${EMAIL}`);
  if (account.role !== "CUSTOMER") {
    throw new Error(`${EMAIL} is ${account.role}; use a CUSTOMER account so a crash can't lock out an admin.`);
  }
  originalPhone = account.phone;
  if (!originalPhone) {
    await prisma.user.update({ where: { id: account.id }, data: { phone: "0771234999" } });
    account = { ...account, phone: "0771234999" };
  }
  await prisma.repairTicket.deleteMany({ where: { ticketNumber: CANARY.number } });
  ticket = await prisma.repairTicket.create({
    data: {
      ticketNumber: CANARY.number,
      customerId: account.id,
      deviceType: "PHONE",
      brand: "Verify",
      model: "X1",
      issueTitle: "Screen replacement",
      photos: [CANARY.photo],
      status: "COMPLETED",
      adminNotes: CANARY.notes,
      partsSupplier: CANARY.supplier,
      partsCost: CANARY.partsCost,
      finalCost: CANARY.finalCost,
      billGeneratedAt: new Date(),
    },
  });
}

async function teardown() {
  await prisma.repairTicket.deleteMany({ where: { ticketNumber: CANARY.number } }).catch(() => {});
  await prisma.user.update({
    where: { email: EMAIL },
    data: {
      blocked: false,
      phone: originalPhone,
      sessionsValidFrom: new Date(Date.now() - 3_600_000),
    },
  }).catch(() => {});
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "track:" } } }).catch(() => {});
}

// ── the migration landed correctly ──────────────────────────────────
async function checkMigration() {
  const [{ tickets, tokens, blank }] = await prisma.$queryRaw`
    SELECT count(*)::int AS tickets,
           count(DISTINCT "trackToken")::int AS tokens,
           count(*) FILTER (WHERE "trackToken" IS NULL OR "trackToken" = '')::int AS blank
    FROM "RepairTicket"`;
  check(tickets === tokens && blank === 0,
    "Every ticket has a distinct, non-empty trackToken",
    `${tickets} tickets / ${tokens} distinct / ${blank} blank`);

  // sessionsValidFrom is NOT NULL with a default, so the thing worth checking
  // is that the backfill didn't set a cut-off in the future — that would have
  // signed every existing customer out the moment the migration ran.
  const [{ future }] = await prisma.$queryRaw`
    SELECT count(*) FILTER (WHERE "sessionsValidFrom" > NOW())::int AS future FROM "User"`;
  check(future === 0, "The migration signed nobody out (no future session cut-offs)",
    `${future} account(s) with a cut-off in the future`);

  const [{ present }] = await prisma.$queryRaw`
    SELECT count(*)::int AS present FROM information_schema.tables WHERE table_name = 'RateLimit'`;
  check(present === 1, "The RateLimit table exists");
}

// ── the tracking link is a milestone view, not a back door ──────────
async function checkTracker() {
  const html = await (await req(`/track/${ticket.trackToken}`, new Jar())).text();
  check(html.includes(CANARY.number), "Tracking link opens without signing in");
  check(/Screen replacement/i.test(html), "Tracking link shows the repair milestones");

  for (const [label, needle] of [
    ["admin notes", CANARY.notes],
    ["parts supplier", CANARY.supplier],
    ["parts cost", String(CANARY.partsCost)],
    ["final cost", String(CANARY.finalCost)],
    ["photos", "VERIFY-PHOTO"],
    ["the customer's phone", account.phone],
    ["the customer's email", EMAIL],
  ]) {
    check(!html.includes(needle), `Tracking link hides ${label}`,
      html.includes(needle) ? `LEAKED: ${needle}` : "");
  }

  const bogus = await (await req("/track/11111111-2222-3333-4444-555555555555", new Jar())).text();
  check(!bogus.includes(CANARY.number), "A guessed tracking token reveals nothing");
}

// ── number + phone lookup can't be used to enumerate tickets ────────
async function checkManualLookup() {
  const last4 = account.phone.replace(/\D/g, "").slice(-4);
  const good = await (await req(`/track?t=${CANARY.number}&p=${last4}`, new Jar())).text();
  check(good.includes(CANARY.number) && !NOT_FOUND.test(good),
    "Ticket number + last 4 phone digits finds the repair");

  const wrong = last4 === "0000" ? "1111" : "0000";
  const bad = await (await req(`/track?t=${CANARY.number}&p=${wrong}`, new Jar())).text();
  check(NOT_FOUND.test(bad), "Wrong phone digits are refused");
  check(!bad.includes(CANARY.notes) && !bad.includes(String(CANARY.finalCost)),
    "A refused lookup leaks nothing about the ticket");

  const unknown = await (await req(`/track?t=ZZ-NOPE-99&p=${last4}`, new Jar())).text();
  check(NOT_FOUND.test(unknown), "An unknown ticket number gets the identical message");
  // Non-enumerability: "this ticket exists but you got the phone wrong" must
  // look the same as "no such ticket". Compare the rendered outcome, ignoring
  // the number each page echoes back into the form field.
  const outcome = (html) => ({
    notFound: NOT_FOUND.test(html),
    // The result panel only renders on a hit; its heading is the tell.
    showsResult: /Where is my device\?[\s\S]{0,4000}Repair timeline/i.test(html),
  });
  const a = outcome(bad), b = outcome(unknown);
  check(a.notFound === b.notFound && a.showsResult === b.showsResult && !a.showsResult,
    "Wrong phone and unknown ticket are indistinguishable outcomes",
    `wrong-phone ${JSON.stringify(a)} vs unknown ${JSON.stringify(b)}`);
}

// ── the limiter, against real Postgres ──────────────────────────────
async function checkRateLimit() {
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "track:" } } });
  const last4 = account.phone.replace(/\D/g, "").slice(-4);
  const url = `/track?t=${CANARY.number}&p=${last4}`;

  let firstRefusal = 0;
  const TOTAL = 24;
  for (let i = 1; i <= TOTAL; i++) {
    const html = await (await req(url, new Jar())).text();
    if (!(html.includes(CANARY.number) && !NOT_FOUND.test(html)) && !firstRefusal) firstRefusal = i;
  }
  check(firstRefusal === 21, "Tracker refuses the 21st lookup in a minute (policy: 20)",
    `first refusal at ${firstRefusal || "never"}`);

  const row = await prisma.rateLimit.findFirst({ where: { key: { startsWith: "track:ip:" } } });
  check(row?.count === TOTAL, "Counter increments exactly once per request, no lost updates",
    `count = ${row?.count}`);

  await prisma.rateLimit.updateMany({
    where: { key: { startsWith: "track:ip:" } },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  const after = await (await req(url, new Jar())).text();
  check(after.includes(CANARY.number) && !NOT_FOUND.test(after),
    "An expired window clears itself — the block is not permanent");
}

// ── blocking and revocation reach every guarded route ───────────────
async function checkRevocation() {
  const routes = ["/dashboard", "/repairs", `/bill/${ticket.id}`];

  await prisma.user.update({
    where: { email: EMAIL },
    data: { blocked: false, sessionsValidFrom: new Date(Date.now() - 3_600_000) },
  });
  const jar = await signIn();
  for (const r of routes) {
    const res = await reaches(r, jar);
    check(res.ok, `Signed-in customer reaches ${r}`, `HTTP ${res.status}`);
  }

  await prisma.user.update({ where: { email: EMAIL }, data: { blocked: true } });
  for (const r of routes) {
    const res = await reaches(r, jar);
    check(!res.ok && /\/login/.test(res.loc),
      `Blocking ends the session on ${r} — same cookie, next click`,
      `HTTP ${res.status} → ${res.loc || "(rendered anyway)"}`);
  }

  const blockedJar = await signIn();
  const blockedRes = await reaches("/dashboard", blockedJar);
  check(!blockedRes.ok, "A blocked account cannot sign back in", `HTTP ${blockedRes.status}`);

  // What changePassword / resetPassword do.
  await prisma.user.update({
    where: { email: EMAIL },
    data: { blocked: false, sessionsValidFrom: new Date(Date.now() - 3_600_000) },
  });
  const jar2 = await signIn();
  check((await reaches("/dashboard", jar2)).ok, "Access is restored once unblocked");

  await prisma.user.update({
    where: { email: EMAIL },
    data: { sessionsValidFrom: new Date(Date.now() + 5_000) },
  });
  for (const r of routes) {
    const res = await reaches(r, jar2);
    check(!res.ok && /\/login/.test(res.loc),
      `A password change signs other devices out of ${r}`,
      `HTTP ${res.status} → ${res.loc || "(rendered anyway)"}`);
  }

  await new Promise((r) => setTimeout(r, 6_000));
  const jar3 = await signIn();
  check((await reaches("/dashboard", jar3)).ok,
    "A session minted after the password change still works");
}

// ── run ─────────────────────────────────────────────────────────────
try {
  await fetch(`${BASE}/api/auth/csrf`).catch(() => {
    throw new Error(`No server answering at ${BASE} — start it first.`);
  });
  await setup();
  await checkMigration();
  await checkTracker();
  await checkManualLookup();
  await checkRateLimit();
  await checkRevocation();
} catch (e) {
  check(false, "verification harness crashed", e?.message ?? String(e));
} finally {
  await teardown();
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "  ok  " : " FAIL "} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("\nNot verified. Do not ship this instance until these pass.");
}
console.log(
  "\nStill manual: sign in with the wrong password 9 times and confirm the\n" +
  '"too many sign-in attempts" message, then that it clears. That path runs\n' +
  "through a form action this script cannot call.",
);
process.exit(failed.length ? 1 : 0);
