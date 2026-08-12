# Mobilux — Technical Design Document

**Version:** 1.4 · **Last updated:** 7 August 2026
**Audience:** developers working on or taking over this codebase.

Related: [SHIPPING-PLAN.md](SHIPPING-PLAN.md) · [OPERATIONS.md](OPERATIONS.md) · [PROPOSAL.md](PROPOSAL.md) · [REPORT.md](REPORT.md) · [README](../README.md) for setup

> Weeks 1–4 of the shipping plan are done — everything below describes code
> that exists and has been verified against a live database, not a plan.
> The 🔜 marker this document used to carry for weeks 2–4 work is retired;
> anything still pending is in [§10](#10-known-limitations) or
> [SHIPPING-PLAN.md](SHIPPING-PLAN.md)'s weeks 5–6.

---

## Contents

1. [System overview](#1-system-overview)
2. [Actors & permissions](#2-actors--permissions)
3. [Architecture](#3-architecture)
4. [Data model](#4-data-model)
5. [Authentication & session design](#5-authentication--session-design)
6. [Authorisation](#6-authorisation)
7. [Key flows](#7-key-flows)
8. [Security decisions](#8-security-decisions)
9. [Deployment & environments](#9-deployment--environments)
10. [Known limitations](#10-known-limitations)

---

## 1. System overview

Mobilux is a repair-shop management system with a customer-facing front end. One
codebase serves three audiences: the public web site, the customer's own
workspace, and the shop's back office.

It is deployed **once per shop**. There is no shared multi-tenant database —
each shop gets its own deployment, database, file store and signing secret.

```
                    ┌─────────────────────────────────────┐
   Public visitor ──►  Marketing site · Storefront        │
                    │  Repair tracker (token / number)    │
                    └─────────────────────────────────────┘
                    ┌─────────────────────────────────────┐
   Customer ────────►  Dashboard · My repairs · My orders │
                    │  Bills · Payments · Feedback        │
                    └─────────────────────────────────────┘
                    ┌─────────────────────────────────────┐
   Staff / Admin ───►  Repair board · Bill builder        │
                    │  Payments · Products · Reports      │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────▼─────────────────────┐
                    │  Next.js server (Server Components  │
                    │  + Server Actions)                  │
                    └───────────────┬─────────────────────┘
                                    │
          ┌─────────────┬───────────┴────────┬──────────────┐
          ▼             ▼                    ▼              ▼
     PostgreSQL    Vercel Blob           Resend        Auth.js v5
     (Neon)        (uploads)             (email)       (JWT sessions)
```

### Why this shape

- **Server Components + Server Actions, no REST API.** There is no mobile client
  and no third-party integration, so a separate API layer would be indirection
  with no consumer. Data is fetched in the component that renders it; mutations
  are server actions called directly from forms. The only HTTP route is Auth.js's
  own handler.
- **One deployment per shop, not row-level multi-tenancy.** A `shopId` column on
  every table means one missed `where` clause leaks another shop's customers.
  Separate databases make that class of bug impossible, and at this scale the
  hosting cost is zero (free tiers). The trade-off is per-shop provisioning
  work — see [SHIPPING-PLAN.md](SHIPPING-PLAN.md).
- **JWT sessions, not database sessions.** Chosen for edge-middleware
  compatibility. This has a real cost — see [§5](#5-authentication--session-design).

---

## 2. Actors & permissions

Three roles, defined in `Role` (`prisma/schema.prisma`).

### 2.1 Customer (`CUSTOMER`)

The device owner. Signs up themselves or is created by the shop.

Can: submit a repair request with photos · watch their repair's timeline · read
technicians' notes and photos on their own repairs · accept or decline a
during-repair damage report · view and print their bill · upload a bank transfer
receipt · buy from the storefront · leave a review · earn loyalty discounts.

Cannot see anything belonging to another customer. Every customer-scoped query
re-checks ownership against the database rather than trusting a form field.

### 2.2 Staff / repairman (`STAFF`)

The people at the bench and the counter. Each has their own account, created by
the owner under Admin → Staff, and signs in at `/staff/login`.

Can: everything on the bench (log repairs, update status, parts, costs, photos,
notes) **plus billing** (build and issue bills, mark paid, verify bank receipts),
plus the storefront catalogue, orders and review moderation.

Cannot: see revenue or profit reports · change shop settings or bank accounts ·
delete a repair or a timeline entry · block a customer · open the customer
directory · change loyalty pricing · create or remove staff accounts · withdraw
a reported bench error or record a customer's decision on their behalf.

That last one matters: a technician reporting a mishap and then withdrawing it
would erase the record Admin → Bench errors is built on.

### 2.3 Admin / shop owner (`ADMIN`)

Everything staff can do, plus the money and configuration: reports, settings,
bank accounts, deletions, customer blocking, staff management.

### 2.4 Permission matrix

The table below is generated from `lib/permissions.ts`, which is the only place
this is decided. The permission name is what a page or action actually asks for.

| Action | Permission | Customer | Staff | Admin |
|---|---|:---:|:---:|:---:|
| Submit a repair request | *(own)* | ✅ own | ✅ any | ✅ any |
| View repair | *(own)* | own only | ✅ | ✅ |
| Update repair status / notes / parts | `repair:write` | — | ✅ | ✅ |
| Build & issue a bill | `bill:write` | — | ✅ | ✅ |
| Mark a bill paid / verify a receipt | `bill:write` / `payment:verify` | — | ✅ | ✅ |
| Report a during-repair issue | `repair:issue` | — | ✅ | ✅ |
| Accept / decline an issue | `repair:issue-resolve` | ✅ own | ❌ | ✅ on behalf |
| Withdraw a reported issue | `repair:issue-resolve` | — | ❌ | ✅ |
| Delete a repair or timeline entry | `repair:delete` | — | ❌ | ✅ |
| Reports (revenue, profit, bench errors) | `report:read` | — | ❌ | ✅ |
| Products & storefront | `product:write` / `order:write` | — | ✅ | ✅ |
| Moderate reviews | `review:moderate` | — | ✅ | ✅ |
| Loyalty discount tiers | `discount:write` | — | ❌ | ✅ |
| Customer directory | `customer:manage` | — | ❌ | ✅ |
| Block / unblock a customer | `customer:block` | — | ❌ | ✅ |
| Shop settings & bank accounts | `settings:write` | — | ❌ | ✅ |
| Create / deactivate staff | `staff:manage` | — | ❌ | ✅ |
| Activity log (who deleted what, who moved money) | `audit:read` | — | ❌ | ✅ |

Enforcement is **server-side in every case**. Hiding a nav item is presentation,
not security — see [§6](#6-authorisation).

`npm run verify:permissions` asserts this table, audits that no server action
was left unguarded, and drives a real technician session against every
back-office route.

### 2.5 Anonymous visitor

Browses the marketing site and storefront, and tracks a repair without an
account — either by tracking link, or by ticket number plus the last four digits
of the phone on file. Sees milestones and dates only: no technician notes, no
photos, no damage-dispute text, no costs.

---

## 3. Architecture

### 3.1 Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, Radix UI primitives |
| ORM | Prisma 6 |
| Database | PostgreSQL (Neon in production, Docker locally) |
| Auth | Auth.js v5 (`next-auth@beta`), credentials + JWT |
| Files | Vercel Blob (production), local disk (dev) |
| Email | Resend HTTP API |
| PDF | `@react-pdf/renderer`, client-side |
| Hosting | Vercel |

### 3.2 Route groups

`src/app/` uses route groups so each audience gets its own layout and guard.

| Group | Purpose | Guard |
|---|---|---|
| `(marketing)` | Landing, storefront, repair tracker | Public |
| `(auth)` | Login, register, forgot password | Public |
| `(app)` | Customer workspace | `(app)/layout.tsx` → `requireUser()`, redirects ADMIN to `/admin` |
| `admin` | Shop back office | `admin/layout.tsx` → `requireStaff()`, then `requirePermission()` per page |
| `bill/[id]` | Printable invoice | **No layout above it** — the page calls `requireUser()` itself, then owner-or-admin |
| `api/auth/[...nextauth]` | Auth.js handler | — |
| `staff/login` | Shop team sign-in | Public, `noindex`, not linked from the site |
| `api/cron/reset-demo` | Demo instance's nightly reset | Three independent guards — see [§9.1](#91-per-instance-resources) |

⚠️ **`bill/[id]` is the odd one out and worth knowing about.** Every other
signed-in route inherits a DB-validated guard from the layout above it, so the
page itself can read `auth()` for the user id and trust that the account was
re-checked. `bill/[id]` has no such layout. It read the session cookie directly
until 6 August 2026, which meant blocking a customer — or a password change that
was supposed to end their other sessions — did not reach it: the old cookie kept
opening the bill until it expired. Found by the week-1 verification, fixed by
switching the page to `requireUser()`. **Any new route added outside `(app)` and
`admin` has the same trap.**

### 3.3 Code layout

```
src/
  app/            routes, grouped as above
  components/     shared UI; ui/ holds the Radix-based primitives
  lib/
    actions/      server actions, one file per domain
    auth-guard.ts session + live DB re-validation  ← every guard goes through here
    rate-limit.ts fixed-window limiter on Postgres
    permissions.ts  the can(user, action) table — pure, so middleware can use it
    audit.ts      logAudit() — who deleted what, who moved money
    prisma.ts     singleton client
    settings.ts   DB-backed shop configuration
    config.ts     env-var fallbacks for shop identity, incl. DEMO_MODE
    demo-data.ts  demo instance's truncateAll()/seedDemoData(), shared by
                  prisma/seed-demo.ts and the nightly reset route
    demo-accounts.ts  the three well-known demo logins — no Prisma import,
                  safe for the one-click login buttons to import client-side
    bill.ts       bill computation (pure)
    track.ts      public tracker queries (deliberately narrow selects)
  middleware.ts   edge guard — cheap first pass only

scripts/
  migrate-deploy.mjs     runs before next build on Vercel
  db-pull.mjs            copy production data into a local database
  verify-security.mjs    week 1 — post-install security verification (writes)
  verify-permissions.ts  week 3 — the role split, static + live
  verify-audit.ts        week 4.1 — audit log wiring, static + live
  verify-demo.ts         week 4.2/4.3 — demo-mode guards, static + live
```

**Convention:** business rules live in `lib/`, not in components. Anything a
server action and a page both need (bill totals, status ordering, loyalty
discounts) is a pure function in `lib/` so it can't drift between the two.

---

## 4. Data model

15 models. Full definitions in `prisma/schema.prisma`.

```
User ──┬─< RepairTicket ──┬─< StatusUpdate
       │                  ├─< RepairIssue
       │                  ├─< Payment
       │                  └─< Testimonial
       ├─< Order ──< OrderItem >── Product
       ├─< Payment
       ├─< Notification
       ├─< Testimonial
       └─< AuditLog  (actor, optional — SetNull if the account is ever gone)

Setting        key-value shop configuration
DiscountRule   loyalty tiers
PasswordReset  one active reset code per email
RateLimit      fixed-window counters
AuditLog       who deleted what, who moved money — see §6, week 4.1
```

### 4.1 Notable decisions

**`RepairTicket.customerId` is nullable.** Walk-in customers have no account —
the ticket carries `customerName` instead. This is why so many queries branch on
"linked account or not", and why the public tracker's phone check can't verify
walk-ins ([§10](#10-known-limitations)).

**`ticketNumber` is sequential, `trackToken` is not.** The human-readable
`REP-044` is what people say on the phone; the random `trackToken` is what the
public tracker is keyed on, because sequential IDs can be walked.

**Money is `Decimal(10,2)`, never float.** Prisma returns `Decimal` objects —
convert with `Number()` at the edge, and never do arithmetic on the string form.

**JSON columns for lists that are never queried individually**: `billItems`,
`parts`, `receivedItems`, `billShow`, `billPayTo`. Each is re-parsed through a
Zod schema on read — a JSON column is not a validated column.

**Derived-not-typed money.** `partsCost` is computed from the parts list rather
than hand-entered, so the figure can never disagree with the log behind it.

**`User.completedRepairs` is a denormalised counter** driving loyalty discounts,
kept in sync by `syncCompletedRepairs()` and self-healed on dashboard load.

---

## 5. Authentication & session design

### 5.1 Mechanism

Credentials provider (email + password), bcrypt cost 12, Auth.js v5, **JWT
sessions** stored in an HTTP-only cookie. No session table.

### 5.2 The JWT problem, and how it's handled

A JWT is a bearer token the server cannot revoke. Left alone, that means
blocking a customer, demoting a technician, deleting an account or changing a
password has **no effect until the token expires**.

The fix is two-layer:

1. **`session.maxAge` is 8 hours** (down from the 30-day default) — bounds how
   long a stolen cookie is useful.
2. **`lib/auth-guard.ts` re-validates against the database on every protected
   request.** One indexed lookup asks: does this account still exist? Is it
   blocked? Was the token issued before this account's `sessionsValidFrom`
   cut-off?

`User.sessionsValidFrom` is bumped on block, password change and password reset.
Comparison is at second granularity because JWT `iat` carries only seconds.

```
request
  → middleware (edge)      cheap JWT check, no DB — first pass only
  → layout / server action requireUser() / actionAdmin()
      → auth()             decode cookie
      → prisma.user        exists? blocked? token older than cut-off?
      → proceed or reject
```

**Middleware is not a security boundary here.** It runs on the edge where Prisma
can't, so it can only read the token. Every real check happens in a layout, a
page that guards itself, or a server action.

**The failure mode to watch for** is a route that reads `auth()` without a
DB-validated guard above it. Such a route is protected against *signed-out*
visitors (middleware catches those) but not against an account that has since
been blocked or had its sessions revoked — the cookie is still cryptographically
valid, and only the database knows it shouldn't be honoured. `bill/[id]` was
exactly this ([§3.2](#32-route-groups)). Reading `auth()` inside a route that
*does* sit under a guarded layout is fine.

### 5.3 Sign-in separation

Two doors, one credential check: `/login` for customers, `/staff/login` for the
shop team — unadvertised, `noindex`, disallowed in `robots.txt`, never linked
from the public site.

Both end in the same `authorize()` and the same database-checked guards, so
neither door is a security boundary on its own. Entering the wrong one with the
**right** password is a redirect, not a failure: the form names the other
entrance and offers a link. Entering the wrong password says only "invalid email
or password" at both doors, so neither can be used to discover which addresses
belong to the shop's staff.

Rationale: it keeps the customer site clean, and credential stuffing against
staff accounts has to find the entrance first.

Staff have **no self-service password reset** — a technician may not have an
email address the shop controls. The owner sets a new password under Admin →
Staff, which also bumps `sessionsValidFrom`.

---

## 6. Authorisation

**Every check is server-side.** Hidden buttons are presentation.

Three layers, and only the last two are load-bearing:

1. `middleware.ts` — path-based, redirects the obviously-wrong. Cheap, not trusted.
2. **Layout guards** — `requireAdmin()` / `requireUser()`, DB-validated. A route
   with no guarded layout above it must call one of these itself.
3. **Server actions** — every one re-checks. An action is a public HTTP endpoint;
   it never assumes a page guard ran first.

Ownership is always re-checked **against the database**, never against a form
field. The pattern throughout:

```ts
const ticket = await prisma.repairTicket.findUnique({ where: { id } });
if (!ticket || ticket.customerId !== user.id) notFound();
```

Authorisation itself is one table: `can(user, action)` in `lib/permissions.ts`.
Before it there were ~60 copies of `role === "ADMIN"`, which is fine with two
roles and a liability with three — adding STAFF would have meant auditing every
one of them, and "can a technician mark a bill paid?" had sixty answers.

The module is pure — no Prisma, no `server-only` — so `middleware.ts` can use it
for the cheap edge pass. It answers *what may this role do*; whether the account
still exists and is still allowed is `lib/auth-guard`'s job, against the
database, on every request.

Three entry points, all in `lib/auth-guard`:

| | Used by | On failure |
|---|---|---|
| `requireStaff()` | the admin layout | redirect to `/dashboard` |
| `requirePermission(action)` | a page inside it | redirect to `/admin` |
| `actionPermission(action)` | every server action | returns null → `{ error }` |

A technician who types `/admin/reports` lands back on the admin overview rather
than a 403 — they haven't done anything wrong, the page simply isn't theirs.

**`can()` answers what a role may do; `AuditLog` answers what an account
actually did.** `lib/audit.ts`'s `logAudit()` is called from inside the same
transaction as the mutation it records — deleting a repair, marking a bill
paid, verifying or rejecting a payment, deleting a loyalty tier or product,
and every bank-account change — so a failed audit write rolls the mutation
back rather than the action silently going unlogged. Read-only in the UI
(Admin → Activity, `audit:read`, owner-only); nothing deletes an entry.
`npm run verify:audit` checks the wiring.

---

## 7. Key flows

### 7.1 Repair lifecycle

```
SUBMITTED ─► CONFIRMED ─► RECEIVED ─► DIAGNOSING ─► AWAITING_PARTS
   (online)   (accepted)   (at shop)                      │
                                                          ▼
                             PICKED_UP ◄── COMPLETED ◄── IN_PROGRESS
                                                          │
                              CANCELLED ◄─────────────────┘
```

`TicketStatus` also has a `READY_FOR_PICKUP` value, but `lib/status.ts`'s
`STATUS_PIPELINE` deliberately excludes it: completing the repair **is** being
ready for pickup, so `COMPLETED` goes straight to `PICKED_UP`. The value is
kept only for tickets created before that pipeline was simplified — it's
treated as equivalent to `COMPLETED` everywhere a status is read.

Every transition writes a `StatusUpdate` row — the timeline is the audit trail of
the repair itself. Moving **backwards** is treated as a correction, not progress:
it rewinds, deleting the entries it contradicts, and does not notify the
customer.

### 7.2 During-repair damage

The shop's own mistakes, handled explicitly. Shop reports what went wrong plus an
optional free fix; the customer accepts (repair continues at no charge) or
declines (cancelled with a refund). Only one issue may await a decision at a
time. The customer's decision is theirs — an admin can record it on their behalf
for walk-ins and phone calls, and can undo a mis-recorded one.

### 7.3 Payment

Bank-transfer first, because that's how Sri Lankan repair shops actually get
paid. Customer uploads a receipt → `PENDING_VERIFICATION` → the shop verifies or
rejects → customer is notified in-app and by email. There is no card gateway.

### 7.4 Public tracking

```
QR on printed bill ──► /track/<trackToken> ──► milestones only
                                               (no notes, no photos,
Manual entry ────────► /track                   no dispute text)
  ticket number + last 4 of phone
```

The narrow column list in `lib/track.ts` is enforced by the type system: the
timeline component's prop type has no `note` or `photo`, so a future edit that
tries to render one on the public page will not compile.

---

## 8. Security decisions

Full audit in `SECURITY-AUDIT.md` (repo root, gitignored). Summary of what's in
place and why:

| Concern | Decision |
|---|---|
| Password storage | bcrypt cost 12 |
| Session revocation | `sessionsValidFrom` + live DB check on every request ([§5.2](#52-the-jwt-problem-and-how-its-handled)) |
| Brute force | Fixed-window limiter on Postgres — login 8/15min per IP **and** per email, checked before any bcrypt work. Fails **open** on DB error: locking a shop out of its own panel is worse than the attack. |
| Ticket enumeration | Random `trackToken`; manual lookup needs number + phone |
| XSS | React escaping; the two JSON-LD blocks are unicode-escaped |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| Transport | HSTS with preload |
| CSRF | Next's built-in Server Action origin check |
| Uploads | Type + size caps, UUID filenames, `Referrer-Policy` so URLs don't leak |
| Secrets | Never committed; `AUTH_SECRET` unique per deployment |
| Proving it | `npm run verify:security` drives a live server + database — see [OPERATIONS.md §3](OPERATIONS.md#3-verifying-an-install) |

**`script-src` still allows `'unsafe-inline'`.** Next's App Router emits inline
bootstrap scripts and next-themes writes an inline theme script; removing it
needs nonce plumbing that isn't possible while any route is statically rendered.
The other directives do real work regardless.

---

## 9. Deployment & environments

The full variable list, the deploy checklist, and the backup/restore runbook are
in [OPERATIONS.md](OPERATIONS.md). This section is the shape; that one is the
procedure.

### 9.1 Per-instance resources

Every shop needs its own of each. **Never shared** — a shared `AUTH_SECRET` would
let a token minted at one shop validate at another.

| Resource | Notes |
|---|---|
| Vercel project | Same repo, different env vars |
| Neon database | `DATABASE_URL` |
| Vercel Blob store | `BLOB_READ_WRITE_TOKEN` |
| `AUTH_SECRET` | `npx auth secret`, unique |
| Resend key | Optional — email silently no-ops without it |

The demo instance is a second, complete set of the above —
`NEXT_PUBLIC_DEMO_MODE=true`, no Resend key, reset nightly by a Vercel Cron
guarded three independent ways. [OPERATIONS.md §6](OPERATIONS.md#6-demo-instance-and-nightly-reset).

### 9.2 Configuration layers

| Layer | Where | Changed by | Takes effect |
|---|---|---|---|
| First-run fallback | `NEXT_PUBLIC_*` env vars | Installer | Redeploy |
| Live configuration | `Setting` table | Shop owner, in the UI | Immediately |

**The database is the source of truth.** Every surface that shows the shop's
identity — header logo, footer, browser tab title, social previews, JSON-LD,
emails, the printed bill, the public tracker, WhatsApp links, the brand colour —
reads `getShopInfo()`. The env vars only fill in before an owner has saved
anything, so a fresh install looks right on day one.

`NEXT_PUBLIC_*` values are inlined **at build time**, so changing one still
requires a redeploy — but an owner never needs to. They change it in Settings.

### 9.2.1 How a rename reaches every page

`getShopInfo()` is wrapped in `unstable_cache` under the tag `shop-info`, and
memoised per request with React `cache`. It is read by the root layout, so
without the cache it would be six settings rows on every render of every page.

`unstable_cache` persists to the **filesystem** incremental cache, which
survives a server restart. `revalidateTag("shop-info")` in `updateShopInfo` is
therefore the only thing that clears it — restarting the process does not.
That makes the `revalidateTag` call load-bearing, not a nicety: without it a
rename would never appear, even after a redeploy.

Components that cannot read the database — anything under `"use client"`, which
includes the mobile nav sheet and the bill builder's live preview — take the
identity as a prop from the nearest async layout or page.

### 9.2.2 Brand colour

The shop picks a **hue angle**, not a colour. `globals.css` expresses every
branded token as a rotation of `--brand-hue`, which the root layout sets inline
on `<html>` from Settings. Lightness and chroma stay tuned per theme, so a shop
cannot choose something that fails contrast in dark mode. `.brand-scope`
re-declares those tokens so the Settings page can preview a different hue than
the page it sits on.

### 9.3 Migrations

`npm run vercel-build` runs `scripts/migrate-deploy.mjs` before `next build`,
deriving Neon's direct (non-pooled) connection from `DATABASE_URL` automatically.

---

## 10. Known limitations

Honest list. None are secret; all are either accepted trade-offs or scheduled.

1. **Walk-in tickets have no phone number.** So `/track` manual lookup cannot
   verify them — those customers depend entirely on their tracking link.
2. **The build needs a database.** The root layout reads shop identity, so
   `next build` cannot prerender without `DATABASE_URL` reachable. Fine on
   Vercel (migrations already run first); worth knowing if a build ever fails
   with a Prisma connection error rather than a code error.
3. **A technician's permissions are fixed.** There is one STAFF role, not
   per-person permissions. A shop that wants "Nimal can bill but Sunil can't"
   needs a second role; the table in `lib/permissions.ts` is where that would
   go, and nothing else would have to change.
4. **Uploaded files are permanent public URLs.** Unguessable, but not revocable;
   anyone who obtains one keeps access. Accepted for now.
5. **No 2FA**, and password policy is length-only (min 8, no breach check).
6. **`next-auth` is a beta dependency.** Pin it exactly before selling.
7. **English only.** Sinhala/Tamil is probably the biggest adoption lever in this
   market, and a bigger job than it looks.
8. **Almost no automated tests.** `scripts/verify-security.mjs`,
   `scripts/verify-permissions.ts` and `scripts/verify-audit.ts` cover the
   security-critical paths — tracker exposure, ticket enumeration, the rate
   limiter, blocking, session revocation, the whole role split, and who's
   accountable for a deletion or a payment — against a live server and
   database. Everything else is typecheck + build + manual click-through.
   There are no unit tests around bill computation, loyalty tiers or status
   transitions, which is where a silent money bug would live.
9. **Login lockout is not covered by the verification script.** It runs through
   a `useActionState` form action the script cannot invoke over HTTP. The
   limiter underneath it is proven; the wiring is checked by hand.
