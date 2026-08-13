// Proves the three-role split holds: that a technician cannot reach the
// owner's pages, that no server action was left unguarded, and that the
// permission table says what we think it says.
//
//   npm run dev                       # in one terminal
//   npm run verify:permissions        # in another
//
// The HTTP half needs the dev seed logins (an ADMIN, a STAFF and a CUSTOMER)
// and briefly deactivates the staff account, so point it at a development
// database. Set VERIFY_WRITES=1 to confirm that.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { can, PERMISSIONS, type Permission } from "../src/lib/permissions";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN = { email: "admin@mobilux.lk", password: "Admin@123" };
const STAFF = { email: "tech@mobilux.lk", password: "Technician@123" };
const CUSTOMER = { email: "kasun@example.com", password: "Customer@123" };

const results: { ok: boolean; name: string; detail?: string }[] = [];
const check = (ok: boolean, name: string, detail = "") =>
  results.push({ ok, name, detail });

// ── 1. the table itself ─────────────────────────────────────────────
function checkTable() {
  const admin = { role: "ADMIN" as const };
  const staff = { role: "STAFF" as const };
  const customer = { role: "CUSTOMER" as const };

  check(
    PERMISSIONS.every((p) => can(admin, p)),
    "the owner can do everything",
  );
  check(
    PERMISSIONS.every((p) => !can(customer, p)),
    "a customer has no back-office permission at all",
  );
  check(
    PERMISSIONS.every((p) => !can(null, p)),
    "an anonymous visitor has none either",
  );

  // The bench and the counter.
  const staffShould: Permission[] = [
    "repair:write",
    "repair:issue",
    "bill:write",
    "payment:verify",
    "product:write",
    "order:write",
    "review:moderate",
  ];
  // The owner's business.
  const staffShouldNot: Permission[] = [
    "repair:delete",
    "repair:issue-resolve",
    "report:read",
    "customer:manage",
    "customer:block",
    "discount:write",
    "settings:write",
    "staff:manage",
    "audit:read",
  ];

  check(
    staffShould.every((p) => can(staff, p)),
    "a technician gets the bench and the counter",
    staffShould.filter((p) => !can(staff, p)).join(", "),
  );
  check(
    staffShouldNot.every((p) => !can(staff, p)),
    "a technician gets nothing that reveals or changes the business",
    staffShouldNot.filter((p) => can(staff, p)).join(", "),
  );
  check(
    staffShould.length + staffShouldNot.length === PERMISSIONS.length,
    "every permission is accounted for in this test",
    `table has ${PERMISSIONS.length}, test covers ${staffShould.length + staffShouldNot.length}`,
  );
}

// ── 2. no server action left unguarded ──────────────────────────────
// The failure this catches is someone adding an action next year and
// forgetting the guard. A server action is a public HTTP endpoint.
const PUBLIC_ACTIONS = new Set([
  // Sign-in and sign-up are the front door by definition.
  "register", "login", "staffLogin", "logout", "requestUnblock",
  "requestPasswordReset", "verifyResetCode", "resetPassword",
]);

/**
 * Split a file into `name -> body` for every function in it, exported or not,
 * and note which ones are exported. Bodies run to the next top-level
 * declaration, which is rough but enough to see which guard a function calls.
 */
function functionsIn(src: string) {
  const re = /^(export )?(?:async )?function (\w+)/gm;
  const found: { name: string; exported: boolean; start: number }[] = [];
  for (const m of src.matchAll(re)) {
    found.push({
      name: m[2],
      exported: !!m[1],
      start: m.index! + m[0].length,
    });
  }
  return found.map((f, i) => ({
    ...f,
    body: src.slice(f.start, found[i + 1]?.start ?? src.length),
  }));
}

function checkActionsGuarded() {
  const dir = join(process.cwd(), "src", "lib", "actions");
  let audited = 0;
  const unguarded: string[] = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(dir, file), "utf8");
    const fns = functionsIn(src);

    // A function is guarded if it asks the permission table, identifies the
    // caller so it can check ownership itself — or delegates to something in
    // the same file that does. Several actions are thin wrappers
    // (verifyPayment -> reviewPayment), and a wrapper inherits its guard.
    const guarded = new Set(
      fns
        .filter((f) => /actionPermission\(|actionUser\(/.test(f.body))
        .map((f) => f.name),
    );
    for (let pass = 0; pass < 4; pass++) {
      for (const f of fns) {
        if (guarded.has(f.name)) continue;
        const callsGuarded = [...guarded].some((g) =>
          new RegExp(`\\b${g}\\s*\\(`).test(f.body),
        );
        if (callsGuarded) guarded.add(f.name);
      }
    }

    for (const f of fns) {
      if (!f.exported || PUBLIC_ACTIONS.has(f.name)) continue;
      audited++;
      if (!guarded.has(f.name)) unguarded.push(`${file}:${f.name}`);
    }
  }

  check(unguarded.length === 0, `every server action is guarded (${audited} checked)`,
    unguarded.join(", "));

  // And nothing still asks the old yes/no question.
  const stale: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(dir, file), "utf8");
    if (/actionAdmin\(|role === "ADMIN"/.test(src)) stale.push(file);
  }
  check(stale.length === 0, "no action still hardcodes an ADMIN role check",
    stale.join(", "));
}

// ── 3. what a signed-in technician can actually open ────────────────
class Jar {
  private c = new Map<string, string>();
  absorb(res: Response) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const i = pair.indexOf("=");
      this.c.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header() {
    return [...this.c].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function get(path: string, jar?: Jar) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: { cookie: jar?.header() ?? "" },
  });
  jar?.absorb(res);
  return res;
}

async function signIn(who: { email: string; password: string }) {
  const jar = new Jar();
  const { csrfToken } = (await (await get("/api/auth/csrf", jar)).json()) as {
    csrfToken: string;
  };
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: jar.header(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      csrfToken,
      email: who.email,
      password: who.password,
      callbackUrl: `${BASE}/admin`,
    }).toString(),
  });
  jar.absorb(res);
  return jar;
}

/**
 * Submit a page's server-rendered form the way a browser with no JavaScript
 * would. React 19 encodes a useActionState action as $ACTION_REF_n /
 * $ACTION_n:0 / $ACTION_n:1 / $ACTION_KEY hidden inputs; replaying them runs
 * the real action.
 */
async function submitFormRaw(path: string, fields: Record<string, string>) {
  const html = await (await get(path)).text();
  const decode = (s: string) =>
    s.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const hidden = [
    ...html.matchAll(
      /<input type="hidden" name="(\$ACTION[^"]*)"(?: value="([^"]*)")?\s*\/>/g,
    ),
  ].map((m) => [decode(m[1]), decode(m[2] ?? "")] as const);
  if (!hidden.length) throw new Error(`no server-rendered action form at ${path}`);

  const fd = new FormData();
  for (const [k, v] of hidden) fd.set(k, v);
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);

  const jar = new Jar();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    redirect: "manual",
    body: fd,
  });
  jar.absorb(res);
  return { res, jar, text: await res.text() };
}

/** The common case: only the rendered response body matters. */
async function submitForm(path: string, fields: Record<string, string>) {
  return (await submitFormRaw(path, fields)).text;
}

/** Did this submission actually sign someone in, and where did it send them? */
function signedInTo(r: { res: Response; jar: Jar }) {
  const location = r.res.headers.get("location") ?? "";
  const hasSession = /authjs\.session-token/.test(r.jar.header());
  return { ok: r.res.status === 303 && hasSession, location, hasSession };
}

const ALLOWED_FOR_STAFF = [
  "/admin",
  "/admin/tickets",
  "/admin/payments",
  "/admin/products",
  "/admin/orders",
  "/admin/testimonials",
];

const OWNER_ONLY = [
  "/admin/reports",
  "/admin/errors",
  "/admin/notes",
  "/admin/loyalty",
  "/admin/customers",
  "/admin/settings",
  "/admin/staff",
  "/admin/activity",
];

async function checkRoutes() {
  const staff = await signIn(STAFF);
  const overview = await get("/admin", staff);
  check(overview.status === 200, "a technician signs in and reaches /admin",
    `HTTP ${overview.status}`);
  const overviewHtml = await overview.text();

  for (const path of ALLOWED_FOR_STAFF) {
    const res = await get(path, staff);
    check(res.status === 200, `technician can open ${path}`, `HTTP ${res.status}`);
  }

  for (const path of OWNER_ONLY) {
    const res = await get(path, staff);
    const bounced = res.status !== 200 && (res.headers.get("location") ?? "").includes("/admin");
    check(bounced, `technician is turned away from ${path}`,
      res.status === 200 ? "RENDERED IT" : `HTTP ${res.status} -> ${res.headers.get("location")}`);
  }

  // Nav: the links they can't use aren't offered.
  for (const label of ["Reports", "Bench errors", "Settings", "Staff", "Customers", "Activity"]) {
    check(!overviewHtml.includes(`>${label}<`),
      `the ${label} nav link is hidden from a technician`);
  }

  // And the overview itself doesn't hand over the shop's margin.
  for (const word of ["Profit", "Revenue", "Margin"]) {
    check(!overviewHtml.includes(word), `the overview shows no "${word}" to a technician`);
  }

  // An owner still sees all of it.
  const admin = await signIn(ADMIN);
  const adminHtml = await (await get("/admin", admin)).text();
  check(adminHtml.includes("Profit"), "the owner still sees the profit dashboard");
  for (const path of OWNER_ONLY) {
    const res = await get(path, admin);
    check(res.status === 200, `owner can open ${path}`, `HTTP ${res.status}`);
  }

  // A customer has no business in the back office at all.
  const customer = await signIn(CUSTOMER);
  const denied = await get("/admin", customer);
  check(denied.status !== 200, "a customer cannot reach /admin",
    `HTTP ${denied.status} -> ${denied.headers.get("location")}`);

  return staff;
}

// ── 4. two entrances, either of which signs you in ──────────────────
// Both doors run the same credential check and land the account wherever its
// role belongs. Using the "wrong" one used to verify the password and then
// refuse, making the caller retype it on the other page — friction that only
// ever hit someone who had already proved they owned the account, and that
// turned the unadvertised staff URL into something every technician had to be
// told. The door is still unadvertised; it just is not compulsory.
async function checkEntrances() {
  const staffAtCustomerDoor = signedInTo(
    await submitFormRaw("/login", {
      email: STAFF.email,
      password: STAFF.password,
    }),
  );
  check(staffAtCustomerDoor.ok,
    "staff credentials at /login sign in rather than being turned away",
    staffAtCustomerDoor.hasSession ? "" : "no session cookie issued");
  check(staffAtCustomerDoor.location.includes("/admin"),
    "…and land in the back office, not on /dashboard",
    `-> ${staffAtCustomerDoor.location || "(no redirect)"}`);

  const customerAtStaffDoor = signedInTo(
    await submitFormRaw("/staff/login", {
      email: CUSTOMER.email,
      password: CUSTOMER.password,
    }),
  );
  check(customerAtStaffDoor.ok,
    "a customer at /staff/login signs in too",
    customerAtStaffDoor.hasSession ? "" : "no session cookie issued");
  check(customerAtStaffDoor.location.includes("/dashboard"),
    "…and lands on their own dashboard, not in /admin",
    `-> ${customerAtStaffDoor.location || "(no redirect)"}`);

  const wrongPassword = await submitForm("/staff/login", {
    email: STAFF.email,
    password: "definitely-not-it",
  });
  check(/Invalid email or password/.test(wrongPassword),
    "a wrong password at /staff/login says nothing about the account");
  check(!/customer account|deactivated/i.test(wrongPassword),
    "…and cannot be used to discover which addresses are staff");

  const res = await get("/staff/login");
  const html = await res.text();
  check(/noindex/.test(html), "/staff/login asks search engines not to index it");

  const robots = await (await get("/robots.txt")).text();
  check(/Disallow:.*\/staff/.test(robots), "robots.txt disallows /staff");

  const landing = await (await get("/")).text();
  check(!landing.includes("/staff/login"),
    "the public site never links to the staff entrance");
}

// ── 5. deactivation ends the session now, not in eight hours ────────
async function checkDeactivation(staffJar: Jar) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const before = await get("/admin", staffJar);
    check(before.status === 200, "technician session is live before deactivation");

    await prisma.user.update({
      where: { email: STAFF.email },
      data: { blocked: true, sessionsValidFrom: new Date() },
    });

    const after = await get("/admin", staffJar);
    check(
      after.status !== 200 && (after.headers.get("location") ?? "").includes("/login"),
      "deactivating signs them out on the very next click, same cookie",
      after.status === 200 ? "STILL IN" : `HTTP ${after.status} -> ${after.headers.get("location")}`,
    );

    const cannotReturn = await submitForm("/staff/login", {
      email: STAFF.email,
      password: STAFF.password,
    });
    check(/deactivated/i.test(cannotReturn),
      "a deactivated technician is told plainly, and cannot sign back in");
    check(!/Request unblock/i.test(cannotReturn),
      "…and is not offered the customer unblock-request flow");
  } finally {
    await prisma.user.update({
      where: { email: STAFF.email },
      data: {
        blocked: false,
        unblockRequested: false,
        sessionsValidFrom: new Date(Date.now() - 3_600_000),
      },
    });
    await prisma.$disconnect();
  }
}

// ── run ─────────────────────────────────────────────────────────────
async function main() {
  checkTable();
  checkActionsGuarded();

  if (process.env.VERIFY_WRITES === "1") {
    const staff = await checkRoutes();
    await checkEntrances();
    await checkDeactivation(staff);
  } else {
    console.log(
      "Skipping the HTTP checks — set VERIFY_WRITES=1 and start the dev server\n" +
        "to run them. The table and the static audit above ran regardless.\n",
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
    console.log("\nThe role split is not holding. Do not ship this instance.");
  }
  process.exit(failed.length ? 1 : 0);
}

main()
  .catch((e) => check(false, "harness crashed", e?.message ?? String(e)))
  .then(report);
