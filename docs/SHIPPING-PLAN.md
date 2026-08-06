# Shipping Plan — six weeks to a sellable product

**Written:** 31 July 2026 · **Pace assumed:** ~20 hrs/week · **Target:** first paying shop by week 6

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [OPERATIONS.md](OPERATIONS.md) ·
[INSTALL-RUNBOOK.md](INSTALL-RUNBOOK.md) · [HANDOVER.md](HANDOVER.md) ·
[PRIVACY.md](PRIVACY.md) · [PROPOSAL.md](PROPOSAL.md) · [REPORT.md](REPORT.md) ·
`SECURITY-AUDIT.md` (repo root, gitignored)

---

## Decisions this plan is built on

| | |
|---|---|
| **Business model** | One-off install + setup fee per shop. Optional monthly maintenance. Not SaaS. |
| **Actors** | Customer · Staff (repairman) · Admin (shop owner) — three roles, see [ARCHITECTURE.md](ARCHITECTURE.md#2-actors--permissions) |
| **Staff powers** | Bench work **plus billing**. No reports, no settings, no deletions. |
| **Sign-in** | Separate `/staff/login` for the shop team; `/login` stays customer-only. |
| **Demo** | Separate Vercel deployment + separate Neon DB, fictional data, nightly reset. Mobilux's data never touched. |
| **Branding** | Code falls back to a neutral placeholder; **Admin → Settings is the real control** and must work everywhere. |

## How to read this

Each week is ~20 hours, broken into chunks that fit one evening. Tick them off in
order — later weeks assume earlier ones are done. **Week 1 and Week 2 are
blocking**; nothing else matters until they're finished.

Estimates are honest, not optimistic. If a week runs over, push the rest back
rather than skipping the verification steps.

---

## Week 1 — Unblock and verify (~18 h)

Nothing ships until this week is done. It's mostly not coding.

### 1.1 Write the LICENSE ⛔ (2 h)

There is no licence file, so by default **all rights are reserved and nobody may
legally use the software** — including someone who has paid you.

For "I sell installs but keep ownership" you want a short proprietary EULA, not
an open-source licence (MIT/Apache would let a buyer resell your work).

- [x] Write `LICENSE` — proprietary, grants one shop the right to run one instance
- [x] Write a one-paragraph "what you are buying" note for the proposal —
      "What you are actually buying" in [PROPOSAL.md](PROPOSAL.md)
- [x] Decide: does the GitHub repo stay **private**? **Yes — decided 6 Aug 2026.**
      Buyers see the demo deployment, never the source.

### 1.2 Apply and verify the security migration ⛔ (4 h)

The security work is typechecked and builds, but **has never run against a
database**. Until it does, none of it is proven.

**Done 6 Aug 2026.** Migration applied; 33/33 checks pass via
`npm run verify:security` ([OPERATIONS.md §3](OPERATIONS.md#3-verifying-an-install)).
The verification found and fixed a real hole — see the note below.

- [x] Start Docker Desktop, `npm run db:migrate` — 42 existing tickets each
      backfilled with a distinct `trackToken`, nobody signed out
- [x] Sign in, block that customer from admin → confirm they're kicked on next click
- [ ] Wrong password 9× → confirm "too many attempts", and that it clears
      — **still manual**, the script can't invoke that form action
- [x] Open a tracking link in a private window → milestones show, admin notes and photos do **not**
- [x] `/track` with ticket number + wrong phone digits → "couldn't find that repair"
- [ ] Print a bill → scan the QR → confirm it opens the tracker — **needs a phone**
- [x] Change your password → confirm other devices are signed out

> **Found while verifying:** `/bill/[id]` sits outside both guarded layouts and
> read the session cookie directly, so blocking a customer — and a password
> change that should have ended their other sessions — did not reach it. A stale
> cookie kept opening the bill until it expired. Fixed by switching the page to
> `requireUser()`; the verification script now checks every guarded route, not
> just `/dashboard`. See [ARCHITECTURE.md §3.2](ARCHITECTURE.md#32-route-groups).

### 1.3 Fix the Vercel environment (2 h)

Your live deployment has none of the new `NEXT_PUBLIC_SHOP_*` variables, so
deploying today would make mobiluxlk.vercel.app say "Your Shop".

- [ ] Add all `NEXT_PUBLIC_SHOP_*` and `NEXT_PUBLIC_BANK_*` vars in Vercel
      (Production + Preview + Development), raw values, no quotes —
      full list in [OPERATIONS.md §1](OPERATIONS.md#1-environment-variables)
- [ ] Deploy and check the live site + a printed bill —
      checklist in [OPERATIONS.md §2](OPERATIONS.md#2-deploying)

Note: `NEXT_PUBLIC_BILL_QUOTE` is read by `src/lib/config.ts` but was missing
from `.env.example` — added 6 Aug 2026.

### 1.4 Backups, actually tested (3 h)

- [ ] Turn on Neon point-in-time restore — steps in
      [OPERATIONS.md §4.2](OPERATIONS.md#42-turn-it-on)
- [ ] **Restore once, to a scratch database, and confirm the data is there** —
      the branch-based drill in [OPERATIONS.md §4.3](OPERATIONS.md#43-test-it--this-is-the-part-people-skip)
- [x] Write the recovery steps down — this becomes a selling point →
      [OPERATIONS.md §4.4](OPERATIONS.md#44-recovery-runbook)

### 1.5 Commit the security work (2 h)

- [x] Already committed as `cf80b98` — the working tree was clean at the start
      of week 1. Nothing to do.

### 1.6 Read the architecture doc (5 h)

- [x] Read [ARCHITECTURE.md](ARCHITECTURE.md) end to end and correct anything wrong
- [x] It is the reference for weeks 2–3; errors there cost you later

Checked against the code, not just re-read: model count, route guards, session
`maxAge`, rate-limit policies, the security-header set, the public tracker's
column list, and every dependency version claimed in the stack table. All held
except the guard on `/bill/[id]` (§1.2 above). Updated for v1.1: the route-group
table now says which guard each group actually gets, §5.2 and §6 name the
"reads `auth()` with no guarded layout above it" trap, §10 records that the
login-lockout path isn't covered by the script, and §9 points at the new
[OPERATIONS.md](OPERATIONS.md).

---

## Week 2 — Make Settings the real source of truth (~20 h) — **done 6 Aug 2026**

Verified end to end: a rename saved through the real Admin → Settings form
reaches every surface with **no redeploy and no restart** — 31/31 checks.
Details in [ARCHITECTURE.md §9.2](ARCHITECTURE.md#92-configuration-layers).

Today shop identity lives in two places that disagree:

| Reads the **database** (Admin → Settings) | Reads the **env var** (needs redeploy) |
|---|---|
| Bill "pay to" details | Header logo, on every page |
| Pickup / ready messages | Footer copyright |
| Bank accounts | Browser tab title & social previews |
| Shop address, hours | Every transactional email |
| | Hero artwork, bill header |

An owner who renames their shop in Settings sees the bill update and the logo
stay put. That's the most confusing thing a buyer hits in week one.

*(The table above describes how things were before this week. The database now
wins everywhere; the env vars are first-run fallbacks only.)*

### 2.1 Cached shop-info reader (4 h)

- [x] Wrap `getShopInfo()` in `unstable_cache` (or a request-scoped memo) —
      it's about to be called on every render, and six settings lookups per page
      is not acceptable. **Both**: `unstable_cache` across requests, React
      `cache` within one render.
- [x] Invalidate the cache in `updateShopInfo`

> **Turned out to be load-bearing, not an optimisation.** `unstable_cache`
> persists to the filesystem incremental cache, so it survives a server
> restart — `revalidateTag("shop-info")` is the *only* thing that clears it.
> Found by testing: after writing new settings straight to the database and
> restarting the server, every page still showed the old name.

### 2.2 Move each consumer onto it (10 h)

- [x] `Logo`, `site-footer`, `hero-visual` → take the name as a **prop** from the
      layout (layouts are async and can read the DB; these components can't).
      `MobileNav` too — it's a client component that renders `Logo`.
- [x] Root `layout.tsx` → convert the static `metadata` export to async
      `generateMetadata()` so the tab title follows the saved name
- [x] `lib/email.ts` → `sendEmail` reads shop info instead of importing `SHOP`
- [x] `lib/status.ts` → pickup/collection copy takes the shop name as an argument
- [x] `bill-document.tsx` → receives shop info as props

The list above turned out to be about half the real surface. Also migrated:

- [x] The landing page's **JSON-LD** — it published a hardcoded "Colombo" and
      the env name straight to Google
- [x] `site-footer` had `"Fix. Track. Trust. — Colombo, Sri Lanka"` **hardcoded**,
      not even an env var
- [x] Public tracker (both entry points), storefront product page, repairs list,
      admin ticket page, password-reset email and subject line
- [x] **WhatsApp number** — was env-only via a build-time `WHATSAPP_ENABLED`
      constant, so a shop changing numbers needed a redeploy. Now in Settings.
- [x] Both customer **payment cards** showed the `NEXT_PUBLIC_BANK_*` account
      while the bill showed the Settings one — the two disagreed in front of a
      paying customer
- [x] `computeBill` now falls back to the Settings default account before the
      env value, for bills issued before the bill builder existed

### 2.3 Extend the Settings page (4 h)

- [x] Logo mark (upload **and** emoji — image wins, emoji is the fallback,
      lucide phone icon if neither) and accent colour, not just text
- [x] A live preview so an owner can see what they're changing — shows the
      header and the bill letterhead, re-colouring as they pick
- [x] WhatsApp number, which had no Settings field at all

**Brand colour is a hue angle, not a colour picker.** Every branded token in
`globals.css` is a rotation of `--brand-hue`; lightness and chroma stay tuned
per theme. A shop cannot pick something unreadable in dark mode.

### 2.4 Verify (2 h)

- [x] Rename the shop in Settings → confirm logo, footer, tab title, a new email
      and a fresh bill **all** change with no redeploy

Driven through the **real form**, submitted over HTTP the way a browser with no
JavaScript would, so the whole chain runs: `updateShopInfo` → `setSetting` →
`revalidateTag`. 31/31 checks across the landing page, sign-in, register (the
statically prerendered one), both tracker entry points, the customer dashboard
and a printed bill — each asserted to show the new name **and** to no longer
contain the old one, plus the tab title, JSON-LD, brand hue, logo emoji,
WhatsApp number and the bill's "pay to" block.

---

## Week 3 — Three roles and a staff login (~20 h) — **done 6 Aug 2026**

`Role.STAFF` already exists in the schema and is completely unused. This week it
becomes real. See [ARCHITECTURE.md](ARCHITECTURE.md#2-actors--permissions) for the
full permission matrix.

Verified: **51/51** via `npm run verify:permissions`, plus week 1's 33/33 still
green. No schema change was needed.

### 3.1 Permission layer (5 h)

- [x] `lib/permissions.ts` — a single `can(user, action)` table, not scattered
      `role === "ADMIN"` checks. There were ~60 of them; there are now none.
- [x] Actions: `repair:write`, `repair:delete`, `bill:write`, `payment:verify`,
      `report:read`, `settings:write`, `staff:manage`, `customer:block`
- [x] Staff get bench + billing; admin gets everything

Seven more permissions than the list above, because the list didn't cover
everything that already existed: `repair:issue` and `repair:issue-resolve`,
`product:write`, `order:write`, `review:moderate`, `discount:write` and
`customer:manage`.

The `repair:issue` split is the one worth arguing with. A technician can
**report** a bench error — that's them owning their own mistake, and it should
be as frictionless as possible — but cannot **withdraw** one, because
report-then-withdraw would erase the record Admin → Bench errors is built on.
Recording a customer's accept/decline on their behalf is also the owner's, since
it can cancel a repair and agree a refund.

The module is pure (no Prisma, no `server-only`), so `middleware.ts` uses the
same table for its edge pass.

### 3.2 Enforce it (6 h)

- [x] Extend `lib/auth-guard.ts` with `requirePermission()` / `actionPermission()`
      — plus `requireStaff()` for the admin layout as a whole
- [x] Apply to every admin server action — **server-side, not just hidden buttons**.
      53 actions audited; the verification fails the build if a new one lands
      without a guard, which is the mistake that will actually happen.
- [x] Hide the nav items staff can't use (Reports, Settings, Customers) — and
      Bench errors, Notes, Loyalty, Staff
- [x] `middleware.ts` lets STAFF into `/admin`, still blocks CUSTOMER

Also: the admin **overview** is a technician's landing page, and it led with a
profit dashboard. That is now behind `report:read`, the Customers card is behind
`customer:manage`, and the page's subtitle changes from "How the shop is doing"
to "What's on the bench today".

### 3.3 Separate staff sign-in (6 h)

- [x] `/staff/login` — its own screen, its own copy, `noindex`, not linked from
      the public site, and disallowed in `robots.txt`
- [x] A customer account entered at `/staff/login` is rejected, and a staff
      account at `/login` is redirected to the staff entrance
- [x] Remove the admin path from the customer login page — a signed-out
      technician hitting `/admin/*` is now sent to `/staff/login`, not `/login`

The wrong-door message only appears **after the password checks out**, so
neither entrance can be used to discover which addresses belong to the shop's
staff. A wrong password says "invalid email or password" at both doors.

### 3.4 Staff management (3 h)

- [x] Admin → Staff: create a technician account, deactivate one
- [x] Deactivating **must** bump `sessionsValidFrom` so they're out immediately
- [x] Only ADMIN can reach it

Two things the plan didn't call for but the feature needs:

- **Password handoff.** Staff have no self-service reset — a technician may not
  have an email the shop controls. The owner sets the password, sees it once
  with a copy button, and reads it out. Resetting also signs them out everywhere.
- **The owner's own row isn't manageable from here.** Deactivating the last
  admin would lock everyone out of settings with no way back in.

Deactivation reuses the existing `blocked` column rather than adding a second
"can this account sign in" flag — two flags is two places to get it wrong. A
deactivated technician is told plainly and is **not** offered the customer
unblock-request flow, which notifies every admin; that's an employment matter,
not a support ticket.

---

### 3.5 Verify (not in the original plan)

`npm run verify:permissions` — 51 checks:

- the table itself: owner gets everything, customer and anonymous get nothing,
  technician gets exactly the bench and the counter, and every permission in
  the table is covered by the test (so adding one fails until it's classified)
- a static audit that all 53 server actions are guarded, and that no
  `role === "ADMIN"` remains
- a real technician session: 6 back-office routes open, 7 turn them away, 5 nav
  links hidden, no profit figures on the overview — then the same routes as the
  owner to prove the test isn't passing vacuously
- both sign-in doors, in all four combinations
- deactivation ending a live session on the next click

Without `VERIFY_WRITES=1` the table and static audit still run with no server
and no database, so they can go in CI.

---

## Week 4 — Audit log and the demo instance (~20 h)

### 4.1 Audit log (7 h) — **done 7 Aug 2026**

Highest-value item in the whole plan. Nothing currently records who deleted a
repair or marked a bill paid. With staff accounts arriving in week 3, "where did
that LKR 20,000 repair go?" must be answerable.

Verified: **20/20** via `npm run verify:audit` (schema, the `audit:read`
permission, wiring, and — with `VERIFY_WRITES=1` — a real write against the
table), plus week 3's `verify:permissions` still green at 8/8 static (16/16
in the table check, one entry added for `audit:read`).

- [x] `AuditLog { id, actorId, actorName, actorRole, action, entityType, entityId, meta, createdAt }`
      — the two snapshot fields (`actorName`/`actorRole`) so an entry still
      reads correctly if the account's name changes later
- [x] Write from every action that deletes, or moves money — 14 call sites
      across `tickets.ts`, `payments.ts`, `discounts.ts`, `products.ts` and
      `settings.ts`. Extended past the letter of this line to all four
      bank-account actions (add/update/delete/make-primary), not just delete —
      `settings.ts` already called that "the highest-value attack on a repair
      shop" and add/update change *where money is paid* just as much as
      deleting an account does.
- [x] Admin → Activity, filterable by person and date (`FilterMenu`, the same
      component the Repairs list already uses)
- [x] Never deletable from the UI — the honest way to guarantee that is to not
      build the control; `verify:audit` greps the app for `auditLog.delete(`
      and fails the build if one ever appears

### 4.2 Demo instance (10 h) — **code done 7 Aug 2026, provisioning pending**

- [ ] Second Vercel project + second Neon DB + fresh `AUTH_SECRET`, same repo
      — this step is a Vercel/Neon dashboard action, not code; runbook is
      [OPERATIONS.md §6.1](OPERATIONS.md#61-provisioning-once)
- [x] `prisma/seed-demo.ts` — a **fictional** shop ("Ceylon Device Care"),
      8 customers, 25 repairs across all 10 `TicketStatus` values, several
      paid bills, 7 products, 4 reviews, one open dispute (`RepairIssue`
      left `PENDING`), 3 storefront orders. Shared with the reset route via
      `src/lib/demo-data.ts`'s `seedDemoData()`, so there's exactly one
      version of the data, not two that can drift.
- [x] `NEXT_PUBLIC_DEMO_MODE=true` → banner (`components/demo-banner.tsx`,
      rendered once from the root layout), one-click login buttons on
      `/login` and `/staff/login` (`components/demo-login-buttons.tsx`,
      reuses the real `login`/`staffLogin` actions — no new sign-in path),
      "Register" hidden three independent ways (the link, `middleware.ts`,
      and `register()`'s own guard)
- [x] Leave `RESEND_API_KEY` **unset** so the demo can never email a stranger
      — no code needed, `emailConfigured()` already no-ops without it
- [x] Block password changes in demo mode — `changePassword()` and
      `resetPassword()` both refuse outright, or one visitor locks the
      one-click buttons out for everyone until the next reset

### 4.3 Nightly reset (3 h) — **done 7 Aug 2026**

A Vercel Cron hitting a reset route. **Three independent guards** — this is the
one endpoint in the project that must never misfire against a real shop:

- [x] Verify `CRON_SECRET` in the `Authorization` header
- [x] Refuse unless `NEXT_PUBLIC_DEMO_MODE === "true"`
- [x] Refuse unless `DATABASE_URL` matches the demo host (`DEMO_DATABASE_HOST`)
- [x] Then truncate + re-seed — `src/app/api/cron/reset-demo/route.ts`,
      `vercel.json` schedules it for 21:30 UTC (3 AM Asia/Colombo) daily

Verified: **29/29** via `npm run verify:demo` — 20 static (guard order,
`vercel.json`, `.env.example`, `ALL_TABLES` matches every model in
`schema.prisma`, Register/password guards, the buttons reuse the real
sign-in actions) plus 9 live against a disposable scratch database and a
throwaway server instance (never local dev — this truncates everything):
wrong secret → 401, missing header → 401, correct secret → 200 with a real
reset, then the reseeded row counts confirmed directly (8 customers, 25
tickets across all 10 statuses, exactly one open dispute, 7 products, 4
reviews). Also hand-verified: `npm run db:seed:demo` is idempotent (ran
twice clean) and refuses outright without `NEXT_PUBLIC_DEMO_MODE=true`; a
real one-click customer sign-in reaches `/dashboard`; a password-change
attempt while signed in is refused with the expected message.

---

## Week 5 — Documentation and handover (~20 h) — **partly done 7 Aug 2026**

### 5.1 Finish the three documents (8 h)

- [x] [ARCHITECTURE.md](ARCHITECTURE.md) — audited section by section against
      the actual code (not just the parts touched this week). Bumped to
      v1.4, retired the now-stale 🔜 legend (weeks 2–4 are all done, nothing
      left to mark), fixed the §7.1 lifecycle diagram — it still showed
      `READY_FOR_PICKUP` as a live pipeline step between `COMPLETED` and
      `PICKED_UP`, when `lib/status.ts` has treated it as a legacy alias for
      `COMPLETED` since before this week — and added the audit log, the demo
      instance, `/api/cron/reset-demo` and the three newer verify scripts to
      the code-layout and route-groups sections.
- [ ] [PROPOSAL.md](PROPOSAL.md) — still needs **your** pricing, contact
      details and support terms in the `[[…]]` markers. Not filled in here —
      inventing a price or a phone number isn't mine to do.
- [ ] [REPORT.md](REPORT.md) — the ✍️-marked sections (literature review,
      methodology, evaluation, references, conclusion) need your own
      research, your own usage data and your own reflection. Same reason —
      genuinely not fillable by anyone but you.

### 5.2 Shop handover pack (6 h) — **English done, Sinhala/Tamil not attempted**

- [x] [HANDOVER.md](HANDOVER.md) — Settings fields, logging a repair, issuing
      a bill, adding/deactivating a technician, who to call. Template with
      `[[…]]` markers for the shop-specific and installer-specific bits.
- [ ] Sinhala / Tamil translation — deliberately not machine-translated here.
      Wrong instructional copy for shop staff is worse than English-only;
      this needs a native speaker's review, not a guess.

### 5.3 Install runbook (3 h) — **done**

- [x] [INSTALL-RUNBOOK.md](INSTALL-RUNBOOK.md) — the exact per-shop checklist:
      Vercel project → Neon DB → Blob store → `AUTH_SECRET` → env vars →
      migrate → seed admin → verify → hand over, each step linked to the
      relevant [OPERATIONS.md](OPERATIONS.md) section for the "why."

### 5.4 Privacy note (3 h) — **done**

- [x] [PRIVACY.md](PRIVACY.md) — what's stored (including that internal notes
      sometimes carry a phone number or address), where, retention, and the
      controller/processor split. `[[…]]` markers for the two things that are
      genuinely per-shop: Neon region and backup retention days.

---

## Week 6 — First buyer (~20 h)

### 6.1 Price it (2 h)

Structure: **setup fee** (install, their branding, data import, an hour of
training) **plus optional monthly** (hosting, backups, support). Anchor the setup
fee against what a shop loses to a week of lost paperwork, not against your
hours. Free tiers cover hosting until a shop is genuinely busy, so the monthly is
mostly paying for *you being reachable* — price it for the interruption.

### 6.2 The demo post (3 h)

- [ ] 30-second screen recording: take in a repair → customer tracks it
- [ ] Post the **demo link, not the source** — your product is the deployment
- [ ] Sri Lankan phone-repair Facebook groups convert better than LinkedIn here

### 6.3 Onboard one shop you can visit (15 h)

Not a stranger. Someone whose data you can import by hand and who will tell you
honestly what's confusing.

- [ ] Follow your own install runbook and fix it where it's wrong
- [ ] Import their existing records (`prisma/import-legacy.ts` is a starting point)
- [ ] Sit with them for an hour while they use it
- [ ] Write down every question they ask — that list is your week 7

---

## After week 6

Not now, but know they're coming.

- **Provisioning script** (`scripts/setup-tenant.mjs`) — manual setup is fine for
  three shops and a liability at ten
- **How updates reach shops** — if you fix a bug, how does shop #4 get it? Decide
  deliberately rather than discovering it
- **Remaining security items** — F9, F10, F11 in `SECURITY-AUDIT.md`, plus 2FA
  for admin and a breached-password check
- **Walk-in phone numbers** — walk-in tickets have no phone field, so the
  `/track` number+phone fallback can't verify them; they depend entirely on
  their tracking link
- **Sinhala / Tamil UI** — probably the single biggest adoption lever in this
  market, and a bigger job than it looks

---

## Honest assessment

**The product is good.** Intake → tracking → billing → loyalty → storefront is
complete and coherent, the UI is well beyond what most Sri Lankan repair shops
run, and the customer tracker is a genuine differentiator a shop can advertise to
its own customers. The security work closed the things that would have hurt you.

**The gap is not features, it's the business.** Weeks 4–6 exist because selling
software means being responsible for someone else's business data. The
engineering left is about three weeks; the part that takes longer is deciding
you're willing to answer the phone when a shop's app is down on a Saturday.

**Start with one buyer you know.** Everything in weeks 5 and 6 gets sharper after
one real handover, and you'll build the right things instead of the imagined ones.
