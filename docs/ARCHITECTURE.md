# Mobilux — Technical Design Document

**Version:** 1.2 · **Last updated:** 6 August 2026
**Audience:** developers working on or taking over this codebase.

Related: [SHIPPING-PLAN.md](SHIPPING-PLAN.md) · [OPERATIONS.md](OPERATIONS.md) · [PROPOSAL.md](PROPOSAL.md) · [REPORT.md](REPORT.md) · [README](../README.md) for setup

> **Status legend.** Sections describing behaviour that exists today are
> unmarked. Anything marked 🔜 is designed but **not yet built** — it lands in
> weeks 2–4 of the shipping plan. Do not read 🔜 sections as descriptions of the
> current code.

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

### 2.2 Staff / repairman (`STAFF`) 🔜

The people at the bench and the counter. **Schema value exists, currently unused
— every shop worker shares the owner's admin login today.** Week 3 makes it real.

Can: everything on the bench (log repairs, update status, parts, costs, photos,
notes) **plus billing** (build and issue bills, mark paid, verify bank receipts).

Cannot: see revenue or profit reports · change shop settings or bank accounts ·
delete a repair · block a customer · create or remove staff accounts.

### 2.3 Admin / shop owner (`ADMIN`)

Everything staff can do, plus the money and configuration: reports, settings,
bank accounts, deletions, customer blocking, staff management.

### 2.4 Permission matrix 🔜

| Action | Customer | Staff | Admin |
|---|:---:|:---:|:---:|
| Submit a repair request | ✅ own | ✅ any | ✅ any |
| View repair | own only | ✅ | ✅ |
| Update repair status / notes / parts | — | ✅ | ✅ |
| Build & issue a bill | — | ✅ | ✅ |
| Mark a bill paid / verify a receipt | — | ✅ | ✅ |
| Report a during-repair issue | — | ✅ | ✅ |
| Accept / decline an issue | ✅ own | — | ✅ on behalf |
| Delete a repair or timeline entry | — | ❌ | ✅ |
| Reports (revenue, profit, bench errors) | — | ❌ | ✅ |
| Products & storefront | — | ✅ | ✅ |
| Moderate reviews | — | ✅ | ✅ |
| Shop settings & bank accounts | — | ❌ | ✅ |
| Block / unblock a customer | — | ❌ | ✅ |
| Create / deactivate staff | — | ❌ | ✅ |

Enforcement is **server-side in every case**. Hiding a nav item is presentation,
not security — see [§6](#6-authorisation).

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
| `admin` | Shop back office | `admin/layout.tsx` → `requireAdmin()` |
| `bill/[id]` | Printable invoice | **No layout above it** — the page calls `requireUser()` itself, then owner-or-admin |
| `api/auth/[...nextauth]` | Auth.js handler | — |
| `staff/login` 🔜 | Shop team sign-in | Public, `noindex` |

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
    permissions.ts  the can(user, action) table    🔜
    prisma.ts     singleton client
    settings.ts   DB-backed shop configuration
    config.ts     env-var fallbacks for shop identity
    bill.ts       bill computation (pure)
    track.ts      public tracker queries (deliberately narrow selects)
  middleware.ts   edge guard — cheap first pass only

scripts/
  migrate-deploy.mjs   runs before next build on Vercel
  db-pull.mjs          copy production data into a local database
  verify-security.mjs  post-install security verification (writes — read it first)
```

**Convention:** business rules live in `lib/`, not in components. Anything a
server action and a page both need (bill totals, status ordering, loyalty
discounts) is a pure function in `lib/` so it can't drift between the two.

---

## 4. Data model

14 models. Full definitions in `prisma/schema.prisma`.

```
User ──┬─< RepairTicket ──┬─< StatusUpdate
       │                  ├─< RepairIssue
       │                  ├─< Payment
       │                  └─< Testimonial
       ├─< Order ──< OrderItem >── Product
       ├─< Payment
       ├─< Notification
       └─< Testimonial

Setting        key-value shop configuration
DiscountRule   loyalty tiers
PasswordReset  one active reset code per email
RateLimit      fixed-window counters
```

### 4.1 Notable decisions

**`RepairTicket.customerId` is nullable.** Walk-in customers have no account —
the ticket carries `customerName` instead. This is why so many queries branch on
"linked account or not", and why the public tracker's phone check can't verify
walk-ins ([§10](#10-known-limitations)).

**`ticketNumber` is sequential, `trackToken` is not.** The human-readable
`MBX-0044` is what people say on the phone; the random `trackToken` is what the
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

### 5.3 Sign-in separation 🔜

Currently one `/login` for everyone, routed by role after authentication. Week 3
splits it: `/login` for customers, `/staff/login` for the shop team —
unadvertised, `noindex`, its own screen. A customer account entered at the staff
entrance is rejected and vice versa.

Rationale: it keeps the customer site clean, and it means credential-stuffing
against staff accounts has to find the entrance first. It is the standard B2B
pattern.

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

🔜 Week 3 replaces scattered `role === "ADMIN"` comparisons with a single
`can(user, action)` table in `lib/permissions.ts`, so adding a role doesn't mean
auditing 40 call sites.

---

## 7. Key flows

### 7.1 Repair lifecycle

```
SUBMITTED ─► CONFIRMED ─► RECEIVED ─► DIAGNOSING ─► AWAITING_PARTS
   (online)   (accepted)   (at shop)                      │
                                                          ▼
        PICKED_UP ◄── READY_FOR_PICKUP ◄── COMPLETED ◄── IN_PROGRESS
                                                          │
                              CANCELLED ◄─────────────────┘
```

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
3. **No audit log.** Nothing records who deleted a repair or marked a bill paid.
   Becomes urgent the moment staff accounts exist. Week 4.
4. **`STAFF` is unused** — everyone shares the owner's login today. Week 3.
5. **Uploaded files are permanent public URLs.** Unguessable, but not revocable;
   anyone who obtains one keeps access. Accepted for now.
6. **No 2FA**, and password policy is length-only (min 8, no breach check).
7. **`next-auth` is a beta dependency.** Pin it exactly before selling.
8. **English only.** Sinhala/Tamil is probably the biggest adoption lever in this
   market, and a bigger job than it looks.
9. **Almost no automated tests.** `scripts/verify-security.mjs` covers the
   security-critical paths — tracker exposure, ticket enumeration, the rate
   limiter, blocking and session revocation — against a live server and
   database. Everything else is typecheck + build + manual click-through. There
   are no unit tests around bill computation, loyalty tiers or status
   transitions, which is where a silent money bug would live.
10. **Login lockout is not covered by the verification script.** It runs through
    a `useActionState` form action the script cannot invoke over HTTP. The
    limiter underneath it is proven; the wiring is checked by hand.
