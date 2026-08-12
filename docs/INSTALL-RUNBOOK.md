# Install runbook — one shop, start to finish

**Audience:** you, the installer, doing this for a specific shop.
**Not this:** [OPERATIONS.md](OPERATIONS.md), which is the reference manual —
every env var, why each check exists, how backups and restores work. This
document is the checklist you actually follow, in order, with a box to tick.
When a step needs more explanation than fits here, it links to the OPERATIONS.md
section that has it.

Budget half a day for the first one. Once you've done it twice, this is a
1–2 hour job — that's exactly why it's written down now, before the "obvious"
steps stop feeling obvious.

---

## Before you start

- [ ] The shop has agreed a name, and you have their logo (or know they'll add
      one later), phone, email, address, hours and WhatsApp number
- [ ] You have their bank account details for the "pay to" bill field
- [ ] You know whether they have existing records to import (paper, spreadsheet,
      another system) — decide now, not on install day, whether you're doing
      that by hand or writing an import script (`prisma/import-legacy.ts` is a
      starting point, not a finished tool)

## 1. Vercel project

- [ ] New Vercel project, **not** a fork — same repo, new project name
      (e.g. `mobilux-<shopname>`)
- [ ] Connect it to the `main` branch of this repo
- [ ] Do **not** deploy yet — it'll fail without a database. Set env vars first
      (step 5)

## 2. Neon database

- [ ] New Neon project, one database
- [ ] Copy the **pooled** connection string — that's `DATABASE_URL`.
      `scripts/migrate-deploy.mjs` derives the direct one itself; you don't
      need a second variable.
- [ ] Turn on point-in-time restore now, not after something goes wrong —
      [OPERATIONS.md §4.2](OPERATIONS.md#42-turn-it-on)

## 3. Vercel Blob store

- [ ] Create a Blob store under the new Vercel project (Storage tab)
- [ ] Copy the read/write token — that's `BLOB_READ_WRITE_TOKEN`
- [ ] Skipping this is fine for a first look at the demo, but not for a real
      shop: without it, uploaded photos and receipts land on local disk and
      **do not survive the next deploy**

## 4. `AUTH_SECRET`

- [ ] `npx auth secret` — generates a fresh one
- [ ] **Never reuse another shop's, or the demo's.** A shared secret means a
      session token minted for one shop's login would validate at another's

## 5. Every environment variable

- [ ] Work through [OPERATIONS.md §1](OPERATIONS.md#1-environment-variables)
      top to bottom: Required, Shop identity, Optional. Paste values **raw** —
      no surrounding quotes
- [ ] Set them in all **three** Vercel environments (Production, Preview,
      Development) — a Preview deployment missing them silently shows
      "Your Shop" and a bill with no bank details, which is exactly what you'd
      demo to the shop by accident
- [ ] Leave `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for step 7 — don't set
      them permanently, they're a one-time seed input
- [ ] Confirm this is a **real shop project, not the demo** — `NEXT_PUBLIC_DEMO_MODE`,
      `CRON_SECRET` and `DEMO_DATABASE_HOST` must all be **unset** here. Those
      three only ever belong on the separate demo project
      ([OPERATIONS.md §6](OPERATIONS.md#6-demo-instance-and-nightly-reset))

## 6. Deploy and migrate

- [ ] Deploy. `vercel-build` runs `scripts/migrate-deploy.mjs` automatically —
      the schema is applied before the site goes live
- [ ] If the build fails with a Prisma "can't reach database server" error,
      it's `DATABASE_URL`, not a code problem — [OPERATIONS.md §2](OPERATIONS.md#2-deploying)

## 7. Seed the owner's account

- [ ] Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (12+ characters) and
      `SEED_ADMIN_NAME` in Vercel (Production), then run `npm run db:seed`
      against that `DATABASE_URL` from your machine — **not** the bare
      default seed, which refuses to run against what looks like production
      without these set
- [ ] Remove `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from Vercel once it's
      done — they're a one-time input, not a standing credential
- [ ] Sign in as the owner and change the password from the one you set

## 8. Check it's really their shop

Same four checks as every deploy — [OPERATIONS.md §2](OPERATIONS.md#2-deploying):

- [ ] Header shows the shop's name, not "Your Shop"
- [ ] A printed bill shows their bank details and their shop name
- [ ] The bill's QR code opens **their** tracker, not somebody else's
- [ ] Trigger one email (mark a repair ready) and confirm it arrives

## 9. Import existing records (if any)

- [ ] Decided in "Before you start" — do it now, before the shop starts adding
      their own data on top

## 10. Verify

- [ ] `npm run verify:security` against this deployment's database — 
      [OPERATIONS.md §3](OPERATIONS.md#3-verifying-an-install). Point it at a
      throwaway test customer account you create for this, never a real one
- [ ] `npm run verify:permissions` if the shop will have technician accounts
      from day one

## 11. Add their team

- [ ] Admin → Staff — create each technician's account, read them the
      password once (there is no self-service reset for staff)
- [ ] Confirm a technician account can sign in at `/staff/login` and sees the
      bench, not the reports

## 12. Hand over

- [ ] Walk the owner through [the shop handover pack](HANDOVER.md) in person —
      about an hour, per the shipping plan
- [ ] Give them the handover pack itself to keep
- [ ] Agree how they reach you, and what the monthly plan (if any) covers
- [ ] Note the go-live date somewhere — you'll want it for the first
      restore drill and for your own records of who's running what version

## After go-live

- [ ] One restore drill within the first month, on **this** shop's database —
      a drill on your own dev data doesn't prove their backups work
      ([OPERATIONS.md §4.3](OPERATIONS.md#43-test-it--this-is-the-part-people-skip))
- [ ] Add this shop to whatever list you're keeping of "who's running what" —
      there is no provisioning registry yet ([SHIPPING-PLAN.md](SHIPPING-PLAN.md),
      *after week 6*), so for now that list is this checklist plus a note
