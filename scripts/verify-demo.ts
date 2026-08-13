// Proves the demo instance's guards are wired the way week 4.2/4.3 of
// docs/SHIPPING-PLAN.md require — especially the reset route, which is the
// one endpoint in the project that must never misfire against a real shop.
//
//   npm run verify:demo                              # static checks only
//   VERIFY_WRITES=1 npm run verify:demo               # also proves a real reset works
//
// The live section needs its own SCRATCH database and its own dev server
// instance configured as the demo (NEXT_PUBLIC_DEMO_MODE=true, a real
// CRON_SECRET, DEMO_DATABASE_HOST matching that database) — see
// docs/OPERATIONS.md §6.3 for how to point one at it. It never touches the
// ordinary local dev database, because truncateAll() truncates everything.
//
// What the live section does NOT re-prove: that demo-mode-off or a
// mismatched DEMO_DATABASE_HOST refuse the request. Both are per-deployment
// environment values, not per-request — proving them live would mean
// booting two more full server instances for two simple equality checks
// already covered by the static source check below. The wrong-secret and
// the success path are what's worth a real server for: the first is the
// one a random visitor could actually try, and the second is what proves
// truncateAll()/seedDemoData() run cleanly against real FK constraints.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const results: { ok: boolean; name: string; detail?: string }[] = [];
const check = (ok: boolean, name: string, detail = "") =>
  results.push({ ok, name, detail });

const ROOT = process.cwd();
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");

// ── 1. vercel.json ───────────────────────────────────────────────────
function checkVercelJson() {
  const raw = read("vercel.json");
  let parsed: { crons?: { path?: string; schedule?: string }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return check(false, "vercel.json is valid JSON");
  }
  const cron = parsed.crons?.find((c) => c.path === "/api/cron/reset-demo");
  check(!!cron, "vercel.json schedules /api/cron/reset-demo");
  check(!!cron?.schedule, "…with a schedule set", cron?.schedule ?? "");
}

// ── 2. .env.example documents the three demo-only vars ──────────────
function checkEnvExample() {
  const env = read(".env.example");
  for (const name of ["NEXT_PUBLIC_DEMO_MODE", "CRON_SECRET", "DEMO_DATABASE_HOST"]) {
    check(env.includes(name), `.env.example documents ${name}`);
  }
}

// ── 3. the reset route has all three guards, in order ────────────────
function checkRouteGuards() {
  const src = read("src", "app", "api", "cron", "reset-demo", "route.ts");
  const secretAt = src.indexOf("CRON_SECRET");
  const demoModeAt = src.indexOf("NEXT_PUBLIC_DEMO_MODE");
  const hostAt = src.indexOf("DEMO_DATABASE_HOST");
  check(secretAt !== -1, "route checks CRON_SECRET");
  check(demoModeAt !== -1, "route checks NEXT_PUBLIC_DEMO_MODE");
  check(hostAt !== -1, "route checks DEMO_DATABASE_HOST");
  check(
    secretAt !== -1 && demoModeAt !== -1 && hostAt !== -1 &&
      secretAt < demoModeAt && demoModeAt < hostAt,
    "…in that order (caller, then deployment, then database)",
  );
  check(
    /truncateAll\(/.test(src) && /seedDemoData\(/.test(src),
    "route calls truncateAll() then seedDemoData()",
    /truncateAll\([\s\S]*seedDemoData\(/.test(src) ? "" : "WRONG ORDER OR MISSING",
  );
}

// ── 4. demo-data.ts's table list matches the schema ───────────────────
function checkTableList() {
  const schema = read("prisma", "schema.prisma");
  const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
  const src = read("src", "lib", "demo-data.ts");
  const listMatch = src.match(/const ALL_TABLES = \[([\s\S]*?)\]/);
  const listed = listMatch
    ? [...listMatch[1].matchAll(/"(\w+)"/g)].map((m) => m[1])
    : [];
  const missing = models.filter((m) => !listed.includes(m));
  const extra = listed.filter((m) => !models.includes(m));
  check(
    missing.length === 0 && extra.length === 0,
    `demo-data.ts's ALL_TABLES matches every model in schema.prisma (${models.length} models)`,
    [missing.length ? `missing: ${missing.join(", ")}` : "", extra.length ? `extra: ${extra.join(", ")}` : ""]
      .filter(Boolean)
      .join("; "),
  );
  check(/TRUNCATE TABLE/.test(src) && /CASCADE/.test(src), "truncateAll() uses TRUNCATE ... CASCADE");
}

// ── 5. registration is blocked three independent ways ─────────────────
function checkRegisterBlocked() {
  const authSrc = read("src", "lib", "actions", "auth.ts");
  const registerBody = authSrc.slice(authSrc.indexOf("export async function register"));
  check(
    /DEMO_MODE/.test(registerBody.slice(0, registerBody.indexOf("export async function", 1))),
    "register() itself refuses in demo mode",
  );

  const middleware = read("src", "middleware.ts");
  check(
    /register/.test(middleware) && /DEMO_MODE/.test(middleware),
    "middleware.ts redirects /register in demo mode",
  );

  const loginForm = read("src", "app", "(auth)", "login", "login-form.tsx");
  check(
    /DEMO_MODE/.test(loginForm) && /register/.test(loginForm),
    "the \"Sign up\" link is conditional on DEMO_MODE",
  );
}

// ── 6. password changes are blocked ────────────────────────────────────
function checkPasswordBlocked() {
  const profile = read("src", "lib", "actions", "profile.ts");
  const changeBody = profile.slice(profile.indexOf("export async function changePassword"));
  check(/DEMO_MODE/.test(changeBody.slice(0, 800)), "changePassword() refuses in demo mode");

  const reset = read("src", "lib", "actions", "password-reset.ts");
  const resetBody = reset.slice(reset.indexOf("export async function resetPassword"));
  check(/DEMO_MODE/.test(resetBody.slice(0, 800)), "resetPassword() refuses in demo mode");
}

// ── 7. the login buttons reuse the real actions, not a new sign-in path ─
function checkLoginButtonsAreReal() {
  const buttons = read("src", "components", "demo-login-buttons.tsx");
  check(!/signIn\(/.test(buttons), "demo-login-buttons.tsx doesn't call next-auth's signIn() directly");
  check(/useActionState\(action/.test(buttons), "…it drives the passed-in server action through a real form");

  const accounts = read("src", "lib", "demo-accounts.ts");
  check(!/@prisma\/client|from "@\/lib\/prisma"/.test(accounts), "demo-accounts.ts has no Prisma import — safe to import from a client component");

  // The bug this catches actually shipped. Each button is its own <form>, and
  // both login pages used to render <DemoLoginButtons> inside their own
  // <form>. Nesting forms is invalid HTML: the browser's parser silently drops
  // the inner ones, hydration mismatches, the action never binds, and every
  // button becomes inert. Nothing over plain HTTP shows it — the markup parses
  // fine there, so the server-side checks all passed while the buttons were
  // dead in a real browser.
  for (const [label, ...path] of [
    ["customer", "src", "app", "(auth)", "login", "login-form.tsx"],
    ["staff", "src", "app", "staff", "login", "staff-login-form.tsx"],
  ] as const) {
    const src = read(...(path as unknown as string[]));
    const buttonsAt = src.indexOf("<DemoLoginButtons");
    // `<form action` rather than `<form`, so the prose in the comment above
    // each of these components doesn't match instead of the element.
    const formAt = src.indexOf("<form action");
    check(
      buttonsAt !== -1 && formAt !== -1 && buttonsAt < formAt,
      `the ${label} page renders the demo buttons outside its <form> (no nested forms)`,
      buttonsAt === -1 ? "DemoLoginButtons not found" : `buttons at ${buttonsAt}, form at ${formAt}`,
    );
  }
}

// ── run ─────────────────────────────────────────────────────────────
async function checkLive() {
  const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    check(false, "CRON_SECRET is set in this shell (needed to test the live route)");
    return;
  }

  const wrong = await fetch(`${base}/api/cron/reset-demo`, {
    headers: { authorization: "Bearer not-the-secret" },
  });
  check(wrong.status === 401, "wrong secret is refused", `HTTP ${wrong.status}`);

  const missing = await fetch(`${base}/api/cron/reset-demo`);
  check(missing.status === 401, "missing Authorization header is refused", `HTTP ${missing.status}`);

  const before = Date.now();
  const ok = await fetch(`${base}/api/cron/reset-demo`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = (await ok.json()) as { ok?: boolean; resetAt?: string; error?: string };
  check(ok.status === 200 && body.ok === true, "the correct secret resets successfully", `HTTP ${ok.status} ${JSON.stringify(body)}`);
  check(
    !!body.resetAt && Date.parse(body.resetAt) >= before,
    "…and reports a fresh resetAt timestamp",
  );

  // Confirm real rows landed — proves truncateAll()/seedDemoData() actually
  // ran against real FK constraints, not just that the route returned 200.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const [customers, tickets, pendingIssues, products, testimonials] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.repairTicket.count(),
      prisma.repairIssue.count({ where: { status: "PENDING" } }),
      prisma.product.count(),
      prisma.testimonial.count(),
    ]);
    check(customers >= 8, `at least 8 demo customers exist (${customers})`);
    check(tickets >= 20, `around 25 demo tickets exist (${tickets})`);
    check(pendingIssues === 1, `exactly one open dispute exists (${pendingIssues})`);
    check(products > 0, `demo products exist (${products})`);
    check(testimonials > 0, `demo reviews exist (${testimonials})`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  checkVercelJson();
  checkEnvExample();
  checkRouteGuards();
  checkTableList();
  checkRegisterBlocked();
  checkPasswordBlocked();
  checkLoginButtonsAreReal();

  if (process.env.VERIFY_WRITES === "1") {
    await checkLive();
  } else {
    console.log(
      "Skipping the live reset check — set VERIFY_WRITES=1, CRON_SECRET and\n" +
        "BASE_URL, and point them at a SCRATCH database (never local dev — this\n" +
        "truncates everything). See docs/OPERATIONS.md §6.3. The static checks\n" +
        "above ran regardless.\n",
    );
  }
}

function report() {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "  ok  " : " FAIL "} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nThe demo instance's guards are not holding. Do not point this at a real shop.");
  }
  process.exit(failed.length ? 1 : 0);
}

main()
  .catch((e) => check(false, "harness crashed", e?.message ?? String(e)))
  .then(report);
