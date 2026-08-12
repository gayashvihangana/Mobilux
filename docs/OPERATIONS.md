# Operations — running an instance

**Written:** 6 August 2026 · **Audience:** whoever keeps a deployed shop running

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [SHIPPING-PLAN.md](SHIPPING-PLAN.md) ·
[INSTALL-RUNBOOK.md](INSTALL-RUNBOOK.md) — the step-by-step checklist that
follows this reference · [HANDOVER.md](HANDOVER.md) · [PRIVACY.md](PRIVACY.md) ·
[README](../README.md) for local setup

Every shop is a separate deployment with its own database, blob store and signing
secret. This document covers what to set, how to prove it works, and what to do
when something is lost.

---

## 1. Environment variables

`NEXT_PUBLIC_*` values are **inlined at build time**, not read per request.
Changing one requires a redeploy, and Vercel never reads your local `.env`.

Set every variable in **all three** Vercel environments (Production, Preview,
Development). Preview deployments that are missing them silently render
"Your Shop" and a bill with no bank details — which is exactly the thing you
would show a buyer.

Paste values **raw**. No surrounding quotes: Vercel stores the quotes as part of
the value, and `"Mobilux"` renders on the site with the quote marks visible.

### Required

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL. `scripts/migrate-deploy.mjs` derives the direct one itself. |
| `AUTH_SECRET` | `npx auth secret`. **Unique per shop** — a shared secret lets a token minted at one shop validate at another. |
| `AUTH_TRUST_HOST` | `true` |

### Shop identity — public, and shop-specific

All of these fall back to a neutral placeholder, so a missing one is not an
error, just wrong. Read in `src/lib/config.ts`.

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_SHOP_NAME` | Your Shop |
| `NEXT_PUBLIC_SHOP_TAGLINE` | Fix. Track. Trust. |
| `NEXT_PUBLIC_SHOP_PHONE` | +94 71 234 5678 |
| `NEXT_PUBLIC_SHOP_EMAIL` | hello@yourshop.lk |
| `NEXT_PUBLIC_SHOP_CITY` | Colombo, Sri Lanka |
| `NEXT_PUBLIC_SHOP_HOURS` | Mon–Sat, 9:00 AM – 7:00 PM |
| `NEXT_PUBLIC_SHOP_WHATSAPP` | `94712345678` — digits only. Blank hides every WhatsApp button. |
| `NEXT_PUBLIC_WARRANTY_DAYS` | `30` |
| `NEXT_PUBLIC_BILL_QUOTE` | Optional line at the foot of every bill. |
| `NEXT_PUBLIC_BANK_NAME` | printed on unpaid bills |
| `NEXT_PUBLIC_BANK_BRANCH` | |
| `NEXT_PUBLIC_BANK_ACCOUNT_NAME` | |
| `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER` | |

> **These are first-run fallbacks only.** Everything above is also editable
> under **Admin → Settings**, and the saved value wins everywhere — header logo,
> footer, browser tab, social previews, emails, printed bills, the public
> tracker, WhatsApp links, plus a logo mark and brand colour that have no env
> equivalent. Set these so a fresh install looks right on day one; after that
> the shop owner changes their own details and **no redeploy is needed**.
> See [ARCHITECTURE.md §9.2](ARCHITECTURE.md#92-configuration-layers).

### Optional

| Variable | Effect if unset |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Vercel's project domain is used. Set it for a custom domain — **bill QR codes are built from this**, so a wrong value sends customers to somebody else's tracker. |
| `BLOB_READ_WRITE_TOKEN` | Uploads fall back to local disk, which does not survive a deploy. Set it in production. |
| `RESEND_API_KEY` | Email silently no-ops. In-app notifications still work. |
| `EMAIL_FROM` | Sender shown to customers. Domain must be verified in Resend. |

### Never set in production

`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` are for the one-time admin seed only.
Without them `npm run db:seed` refuses to run against production, which is the
guard stopping a public default admin login from being created. The same check
is what stops the development technician account (`tech@mobilux.lk`) from ever
being seeded into a real shop — create those under **Admin → Staff**.

### Demo instance only

Leave all three of these **unset** on a real shop's project. They belong only
on the second, throwaway Vercel project — see [§6](#6-demo-instance-and-nightly-reset).

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `"true"` turns on the banner, the one-click login buttons, hides Register, and blocks password changes. Requires a redeploy. |
| `CRON_SECRET` | Shared secret the nightly reset checks in its `Authorization` header. `openssl rand -base64 32`. |
| `DEMO_DATABASE_HOST` | The demo Neon database's hostname, copied from its `DATABASE_URL`. A second, independent check that the reset route is talking to the demo database before it truncates anything. |

Also leave `RESEND_API_KEY` unset here — with no key, email silently no-ops
(see Optional, above), which is what stops the demo from ever emailing a
stranger.

---

## 2. Deploying

The build reads shop identity from the database to prerender pages, so
`DATABASE_URL` must be reachable **during the build**, not only at runtime. On
Vercel this is already true — migrations run first. A build that fails with a
Prisma "can't reach database server" error is this, not a code fault.

`npm run vercel-build` runs `scripts/migrate-deploy.mjs` and then `next build`.
The script swaps `DATABASE_URL` to Neon's direct (non-pooled) host for the
migration only — `prisma migrate deploy` needs a direct connection to hold its
advisory lock. No `DIRECT_URL` variable is needed.

After the first deploy of a shop, check in this order:

1. The site header shows the shop's name, not "Your Shop".
2. A printed bill shows the right bank details and the right shop name.
3. Scan the bill's QR code with a phone — it must open **that shop's** tracker.
4. Trigger one email (mark a repair ready) and confirm it arrives.

---

## 3. Verifying an install

```bash
npm run dev                                  # terminal 1

BASE_URL=http://localhost:3000 \
VERIFY_WRITES=1 \
VERIFY_EMAIL=test-customer@example.com \
VERIFY_PASSWORD='...' \
npm run verify:security                      # terminal 2
```

Proves, against a live database and a running server: tracking links expose
milestones but not notes, photos, costs or contact details; a guessed token
reveals nothing; the number+phone lookup can't be used to enumerate tickets; the
rate limiter counts atomically and clears itself; and blocking a customer or
changing a password ends every existing session on the next click.

`VERIFY_WRITES=1` is a deliberate speed bump — the script blocks and unblocks the
account you name and creates a throwaway ticket. **Point it at a development or
staging database, never at a shop's live one.** It refuses accounts that are not
`CUSTOMER`, so a crash mid-run cannot lock out an admin.

One check stays manual: sign in with the wrong password nine times, confirm the
"too many sign-in attempts" message, then confirm it clears after the window.

### The role split

```bash
BASE_URL=http://localhost:3000 VERIFY_WRITES=1 npm run verify:permissions
```

Asserts the `can(user, action)` table, audits that every server action is
guarded — the failure this catches is someone adding an action next year and
forgetting — and drives a real technician session against every back-office
route, checking that the owner's pages turn them away, the nav hides what they
can't use, the overview shows them no profit figures, each sign-in door
redirects the wrong role to the right one, and deactivating ends their session
on the next click.

Without `VERIFY_WRITES=1` it still runs the table and the static audit, which
need no server and no database — worth wiring into CI.

It uses the dev seed logins and briefly deactivates the staff account, so point
it at a development database.

---

## 4. Backups and recovery

### 4.1 What protects the data

| Layer | Covers | Does not cover |
|---|---|---|
| Neon point-in-time restore | Any moment inside the retention window: bad migration, mass deletion, corrupted write | Anything older than the window |
| Vercel Blob | Uploaded photos and receipts, stored separately from the database | Not point-in-time — a deleted blob is gone |
| Vercel deployment history | Instant rollback of code | Nothing about data |

Note the gap: a restore rewinds the **database** but not the **blob store**. A
photo uploaded after the restore point still exists as a file, while the row
pointing at it is gone; a photo deleted after the restore point is gone even
though the row comes back. In practice this shows as a broken image on an old
repair, never as lost money.

### 4.2 Turn it on

**First, know which kind of Neon database you have** — this trips people up.
Vercel Postgres *is* Neon underneath, so a database created from Vercel's
Storage tab is a real Neon database that you have **no direct Neon account
for**. Going to neon.tech and trying to sign in gets you a signup page and a
lot of confusion.

| How it was created | Where to manage it |
|---|---|
| Vercel → Storage → Create (the usual path) | **Vercel → the project → Storage → the database.** Use its "Open in Neon" button to reach the Neon console *through* the integration — no separate account, no separate password. |
| Directly at neon.tech | Neon Console, signed in normally (often GitHub SSO). |

Then, in the Neon console either way: the project → **Settings → Storage →
History retention**. Set the retention window and save.

Free tier is limited; check what the shop's plan actually gives you and write
that number into their proposal and privacy note, because "restore to any point
in the last N days" is a thing shops ask about.

### 4.3 Test it — this is the part people skip

An untested backup is a belief, not a backup. Do this once per shop at install,
and again whenever the plan or retention setting changes.

1. Note the current time, and a fact you can check later — e.g. the number of
   repair tickets: `SELECT count(*) FROM "RepairTicket";`
2. Neon Console → **Branches → New branch**. Create it from a point in time
   **a few hours ago**. This is a copy-on-write branch: it costs almost nothing
   and does not touch the live database.
3. Copy the new branch's connection string.
4. Point a local checkout at it and look:
   ```bash
   DATABASE_URL='<branch-url>' npx prisma studio
   ```
   Confirm the customers, repairs and bills are there and look right for that
   moment in time.
5. **Delete the branch** when you're done.

Write down what you saw and when: the date of the last successful restore test
is what makes "your data is backed up" a fact rather than a sales line.

### 4.4 Recovery runbook

**Something was deleted or corrupted, and the shop needs it back.**

1. **Stop the bleeding.** If a bug is still writing bad data, roll the
   deployment back in Vercel first (Deployments → the last good one →
   **Promote to Production**). A restore is pointless while the cause is live.
2. **Establish the moment.** Find the latest time you are confident the data was
   good. Ask the shop: "when did you last see it correct?"
3. **Branch, don't overwrite.** Create a Neon branch from that timestamp.
   Never restore straight over production — if the timestamp is wrong you have
   then lost the good data too.
4. **Verify the branch** with Prisma Studio, as in 4.3. Check the specific
   records the shop is missing.
5. **Cut over.** Once the branch is confirmed good, point the shop's
   `DATABASE_URL` at it in Vercel and redeploy. Neon branches are promotable to
   primary; do that rather than copying rows by hand.
6. **Re-run the install checks** in §2 and §3.
7. **Tell the shop what happened**, what was recovered, and what — if anything —
   was lost between the restore point and now. They will have to re-enter that
   window by hand, so give them the exact time range.

**When the restore point is older than the history window.** The free tier
keeps **6 hours**, which does not cover the way data is actually lost: a repair
is deleted on Saturday and the owner notices on Monday. For anything older than
the window — and for "the Neon project itself is gone" — use the nightly
backups instead of steps 3–5 above. See §4.5.

### 4.5 Restoring from a nightly backup

`.github/workflows/backup.yml` takes an encrypted `pg_dump` every night at
02:00 Colombo time and keeps it for 90 days. This is the backup that covers
the realistic cases; Neon's own history only covers the last few hours.

**To restore one:**

1. **GitHub → Actions → Nightly database backup →** the run from the day you
   want → download the `db-backup-*` artifact. It unzips to
   `backup-YYYY-MM-DD.dump.gpg`.
2. **Decrypt** with the `BACKUP_PASSPHRASE`:
   ```bash
   gpg --decrypt --output backup.dump backup-2026-08-07.dump.gpg
   ```
3. **Restore into a scratch database first** — a Neon branch, or a local
   Docker Postgres. Never straight over production; if it's the wrong night
   you have then destroyed the good data too.
   ```bash
   pg_restore --no-owner --clean --if-exists --dbname="$SCRATCH_URL" backup.dump
   ```
4. **Check the specific records** the shop is missing are actually there.
5. Only then cut over, following steps 5–7 above.

**Two things to know before you need them:**

- **The passphrase is not in the database.** If you store `BACKUP_PASSPHRASE`
  only in GitHub secrets and lose access to the account, the backups are
  unreadable. Keep a copy in a password manager.
- **A backup you have never restored is a belief.** Do the drill in §4.3 once
  per shop at install, using a real artifact from this workflow, not just a
  Neon branch.

**Adding a shop.** The workflow backs up whatever `BACKUP_DATABASE_URL` points
at — one database. For a second shop, either add a second workflow file with
its own secret, or convert the job to a matrix over several secrets. Do it at
install time, as part of [INSTALL-RUNBOOK.md](INSTALL-RUNBOOK.md), not later.

---

## 5. Routine

| When | Do |
|---|---|
| Every install | Set env vars (§1), deploy checks (§2), verification script (§3), restore drill (§4.3) |
| Monthly | Confirm retention is still on; skim Vercel logs for repeated errors |
| Before any migration on a live shop | Take a manual Neon branch first — it's free and instant |
| After any auth, tracker or rate-limit change | Re-run `npm run verify:security` |
| After adding a server action or an admin page | Re-run `npm run verify:permissions` |
| After touching a delete/money action | Re-run `npm run verify:audit` |
| After touching demo-mode code or the reset route | Re-run `npm run verify:demo` |

---

## 6. Demo instance and nightly reset

A second, complete copy of the deployment — same repo, its own Vercel project
and Neon database — a buyer can click through without touching a real shop's
data. `NEXT_PUBLIC_DEMO_MODE=true` is what makes it behave differently: a
banner, one-click sign-in as the owner/technician/customer, no registration,
no password changes, no email. See [ARCHITECTURE.md §9.1](ARCHITECTURE.md#91-per-instance-resources).

### 6.1 Provisioning (once)

1. New Vercel project, same GitHub repo, different name (e.g. `mobilux-demo`).
2. New Neon database — its own `DATABASE_URL`.
3. A **fresh** `AUTH_SECRET` (`npx auth secret`) — never reuse the real shop's.
4. Set every variable in [§1](#1-environment-variables) as normal for a fresh
   install, **plus** the three [demo-only variables](#demo-instance-only).
   Leave `RESEND_API_KEY` unset.
5. Deploy, then `npm run db:migrate` against the new `DATABASE_URL` (or let
   `vercel-build` run it — same as any other install).
6. Seed it once by hand: `NEXT_PUBLIC_DEMO_MODE=true npm run db:seed:demo`
   (with `DATABASE_URL` pointed at the demo database). The cron in step 7
   keeps it fresh after that — this is just so it isn't empty until 3 AM.
7. `vercel.json`'s `crons` entry is already in the repo and picked up
   automatically on deploy — nothing to configure here. It fires at
   21:30 UTC (3:00 AM Asia/Colombo) daily.
8. Open `/login` and `/staff/login` on the new deployment and confirm the
   banner and the one-click buttons are there.

### 6.2 Why three guards on the reset route

`src/app/api/cron/reset-demo/route.ts` truncates and reseeds every table. The
cron config is part of the shared repo, so it also gets registered — pointing
at its own copy of the same path — on the **real** Mobilux project. Three
independent checks, in order:

1. `Authorization: Bearer $CRON_SECRET` — proves the caller is Vercel Cron
   (which adds this header automatically once `CRON_SECRET` is set on the
   project), not a random visitor who found the URL.
2. `NEXT_PUBLIC_DEMO_MODE === "true"` — proves *this deployment* is flagged
   as the demo build. Unset on the real project, so the route 403s there by
   default with no further configuration needed.
3. The live `DATABASE_URL`'s hostname matches `DEMO_DATABASE_HOST` — proves
   the *actual database connection*, independent of (2). Two separate pieces
   of configuration have to agree before anything is truncated.

### 6.3 Testing the reset by hand

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  "https://<demo-project>.vercel.app/api/cron/reset-demo"
```

Expect `{"ok":true,"resetAt":"..."}`. A wrong or missing secret returns 401; a
non-demo deployment or a mismatched database returns 403 — either is the
route refusing correctly, not a bug.
