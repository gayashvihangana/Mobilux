# Shipping Plan — six weeks to a sellable product

**Written:** 31 July 2026 · **Pace assumed:** ~20 hrs/week · **Target:** first paying shop by week 6

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [PROPOSAL.md](PROPOSAL.md) · [REPORT.md](REPORT.md) · `SECURITY-AUDIT.md` (repo root, gitignored)

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

## Week 3 — Three roles and a staff login (~20 h)

`Role.STAFF` already exists in the schema and is completely unused. This week it
becomes real. See [ARCHITECTURE.md](ARCHITECTURE.md#2-actors--permissions) for the
full permission matrix.

### 3.1 Permission layer (5 h)

- [ ] `lib/permissions.ts` — a single `can(user, action)` table, not scattered
      `role === "ADMIN"` checks
- [ ] Actions: `repair:write`, `repair:delete`, `bill:write`, `payment:verify`,
      `report:read`, `settings:write`, `staff:manage`, `customer:block`
- [ ] Staff get bench + billing; admin gets everything

### 3.2 Enforce it (6 h)

- [ ] Extend `lib/auth-guard.ts` with `requirePermission()` / `actionPermission()`
- [ ] Apply to every admin server action — **server-side, not just hidden buttons**
- [ ] Hide the nav items staff can't use (Reports, Settings, Customers)
- [ ] `middleware.ts` lets STAFF into `/admin`, still blocks CUSTOMER

### 3.3 Separate staff sign-in (6 h)

- [ ] `/staff/login` — its own screen, its own copy, `noindex`, not linked from
      the public site
- [ ] A customer account entered at `/staff/login` is rejected, and a staff
      account at `/login` is redirected to the staff entrance
- [ ] Remove the admin path from the customer login page

### 3.4 Staff management (3 h)

- [ ] Admin → Staff: create a technician account, deactivate one
- [ ] Deactivating **must** bump `sessionsValidFrom` so they're out immediately
- [ ] Only ADMIN can reach it

---

## Week 4 — Audit log and the demo instance (~20 h)

### 4.1 Audit log (7 h)

Highest-value item in the whole plan. Nothing currently records who deleted a
repair or marked a bill paid. With staff accounts arriving in week 3, "where did
that LKR 20,000 repair go?" must be answerable.

- [ ] `AuditLog { id, actorId, action, targetType, targetId, meta, createdAt }`
- [ ] Write from every action that deletes, or moves money
- [ ] Admin → Activity, filterable by person and date
- [ ] Never deletable from the UI

### 4.2 Demo instance (10 h)

- [ ] Second Vercel project + second Neon DB + fresh `AUTH_SECRET`, same repo
- [ ] `prisma/seed-demo.ts` — a **fictional** shop, ~8 customers, ~25 repairs
      across every status, paid bills, products, reviews, one open dispute.
      An empty app sells nothing; make it look busy.
- [ ] `NEXT_PUBLIC_DEMO_MODE=true` → banner, one-click login buttons on
      `/login` and `/staff/login`, "Register" hidden
- [ ] Leave `RESEND_API_KEY` **unset** so the demo can never email a stranger
- [ ] Block password changes in demo mode, or one visitor locks everyone out

### 4.3 Nightly reset (3 h)

A Vercel Cron hitting a reset route. **Three independent guards** — this is the
one endpoint in the project that must never misfire against a real shop:

- [ ] Verify `CRON_SECRET` in the `Authorization` header
- [ ] Refuse unless `NEXT_PUBLIC_DEMO_MODE === "true"`
- [ ] Refuse unless `DATABASE_URL` matches the demo host
- [ ] Then truncate + re-seed

---

## Week 5 — Documentation and handover (~20 h)

### 5.1 Finish the three documents (8 h)

- [ ] [ARCHITECTURE.md](ARCHITECTURE.md) — update with roles + staff login as built
- [ ] [PROPOSAL.md](PROPOSAL.md) — fill in **your** pricing and support terms
- [ ] [REPORT.md](REPORT.md) — fill the sections only you can write (testing,
      evaluation, reflection)

### 5.2 Shop handover pack (6 h)

One page per shop, plain language, ideally Sinhala or Tamil as well as English:
what each Settings field does, how to log a repair, how to issue a bill, how to
add a technician, who to call. **This is the difference between one support call
and twenty.**

### 5.3 Install runbook (3 h)

The exact steps you follow per shop: Vercel project → Neon DB → Blob store →
`AUTH_SECRET` → env vars → migrate → seed admin → hand over. Write it down now,
while you still remember; automate it in Phase 6.

### 5.4 Privacy note (3 h)

Each shop is the data controller for its customers; you're the processor. One
page: what's stored, where (Neon/Vercel region), for how long.

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
