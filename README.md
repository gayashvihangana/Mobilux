<div align="center">

# Mobilux

### Fix. Track. Trust.

**Repair management & storefront for a phone repair shop in Colombo.**
Customers book a repair, watch it move step by step, pay in LKR by bank
transfer and collect an itemised invoice. The shop runs the whole bench —
tickets, parts, costs, bills, payments and reports — from one admin panel.

<sub>
Next.js 15 · TypeScript · Tailwind CSS v4 · Prisma · PostgreSQL · Auth.js v5 · Vercel
</sub>

<br />

<img src="docs/screenshots/home.png" alt="Mobilux landing page" width="100%" />

</div>

---

## Contents

- [What it does](#what-it-does)
- [Screenshots](#screenshots)
- [Feature tour](#feature-tour)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Database workflows](#database-workflows)
- [Deploying to Vercel](#deploying-to-vercel)
- [Before going live](#before-going-live)

---

## What it does

### For the customer

Drop a device off (or submit the request online), then follow it the whole way
through — no phone calls, no "is it done yet?".

- Submit a repair request with photos, and get a ticket number back
- Watch a live status timeline: received → diagnosed → parts → repairing → ready
- Track a device without an account at all, using just the ticket number
- Get an itemised invoice with a printable PDF and a QR code back to the tracker
- Pay by bank transfer and upload the receipt for verification
- Earn a loyalty discount that grows with completed repairs
- Buy accessories and pre-owned phones from the storefront
- Leave a review once the repair is done

### For the shop

Everything the bench needs, kept in one place — including the parts of the job
that never reach the customer.

- One board of every open repair, sorted by what needs attention
- Log walk-ins in seconds; link them to an account later if the customer has one
- Track internal cost per repair (parts, suppliers) alongside what was charged →
  real profit per job, not just revenue
- Build an itemised bill line by line with a live invoice preview
- Verify bank-transfer receipts from a queue, or mark a bill paid by cash
- Report an issue that happened on the bench, offer a free fix, and let the
  customer accept or cancel with a refund — tracked as its own cost
- Monthly revenue/profit reports, common faults, top brands
- Moderate reviews, manage products, customers, loyalty tiers and shop settings

---

## Screenshots

<table>
<tr>
<td width="50%"><img src="docs/screenshots/customer-dashboard.png" alt="Customer dashboard" /></td>
<td width="50%"><img src="docs/screenshots/repair-timeline.png" alt="Repair status timeline" /></td>
</tr>
<tr>
<td><b>Customer dashboard</b><br /><sub>Active repairs, loyalty progress and every device at a glance.</sub></td>
<td><b>Live repair timeline</b><br /><sub>Every status change, with the shop's notes attached.</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/track.png" alt="Public repair tracker" /></td>
<td><img src="docs/screenshots/shop.png" alt="Storefront" /></td>
</tr>
<tr>
<td><b>Public tracker</b><br /><sub>Ticket number only — no sign-in, works from the printed bill's QR.</sub></td>
<td><b>Storefront</b><br /><sub>Accessories and pre-owned phones, searchable and filterable.</sub></td>
</tr>
</table>

### Admin

<img src="docs/screenshots/admin-dashboard.png" alt="Admin overview" width="100%" />

<sub><b>Overview</b> — devices on the bench right now, net profit, pending payments and pickups, and where every open repair sits.</sub>

<table>
<tr>
<td width="50%"><img src="docs/screenshots/admin-repairs.png" alt="Admin repairs list" /></td>
<td width="50%"><img src="docs/screenshots/admin-payments.png" alt="Payment verification queue" /></td>
</tr>
<tr>
<td><b>Repairs</b><br /><sub>Every ticket with status, profit and bill state — filter and sort.</sub></td>
<td><b>Payments</b><br /><sub>Bank-transfer receipts waiting on verification.</sub></td>
</tr>
</table>

### The bill

<table>
<tr>
<td width="55%"><img src="docs/screenshots/admin-bill-builder.png" alt="Bill builder" /></td>
<td width="45%"><img src="docs/screenshots/bill.png" alt="Customer invoice" /></td>
</tr>
<tr>
<td><b>Bill builder</b><br /><sub>Line items, discount, warranty and per-field visibility toggles — with a live preview of the invoice.</sub></td>
<td><b>The invoice</b><br /><sub>What the customer gets: printable, downloadable as a PDF, and stamped PAID once settled.</sub></td>
</tr>
</table>

<details>
<summary><b>More screens</b></summary>

<br />

| | |
| --- | --- |
| <img src="docs/screenshots/admin-repair-detail.png" alt="Repair detail" /> | <img src="docs/screenshots/admin-reports.png" alt="Reports" /> |
| **Repair detail** — money, parts, timeline, status controls and the bench-issue flow. | **Reports** — revenue and profit by month, common faults, device types, top brands. |
| <img src="docs/screenshots/new-repair.png" alt="New repair request" /> | <img src="docs/screenshots/admin-customers.png" alt="Customers" /> |
| **New repair request** — what the customer fills in, photos included. | **Customers** — accounts, repair counts, last sign-in, blocking. |
| <img src="docs/screenshots/admin-products.png" alt="Products" /> | <img src="docs/screenshots/admin-loyalty.png" alt="Loyalty rules" /> |
| **Products** — storefront stock, pricing and visibility. | **Loyalty** — discount tiers by completed-repair count. |
| <img src="docs/screenshots/admin-reviews.png" alt="Review moderation" /> | <img src="docs/screenshots/admin-dashboard-light.png" alt="Light theme" /> |
| **Reviews** — nothing reaches the home page until it's approved. | **Light theme** — the whole app follows the system theme, or a manual toggle. |

</details>

<details>
<summary><b>On a phone</b></summary>

<br />

<p>
<img src="docs/screenshots/mobile-home.png" alt="Mobile landing page" width="31%" />
&nbsp;
<img src="docs/screenshots/mobile-dashboard.png" alt="Mobile dashboard" width="31%" />
&nbsp;
<img src="docs/screenshots/mobile-repair.png" alt="Mobile repair timeline" width="31%" />
</p>

</details>

---

## Feature tour

### Repairs

Ten statuses cover the real path a device takes — `SUBMITTED`, `CONFIRMED`,
`RECEIVED`, `DIAGNOSING`, `AWAITING_PARTS`, `IN_PROGRESS`, `COMPLETED`,
`READY_FOR_PICKUP`, `PICKED_UP`, `CANCELLED`. Each change writes a
`StatusUpdate` row (optionally with a note and a photo), which is what the
customer's timeline and the public tracker read from.

A ticket doesn't need an account behind it: walk-ins are logged with just a
name, and can be linked to a registered customer later.

Alongside the customer-facing record, each ticket carries the shop's own
bookkeeping — parts with suppliers and costs, time taken, technician, private
notes — which never appears on the bill but drives the profit figures.

### Issue during repair

When something goes wrong on the bench, the shop reports it against the ticket
with an optional free-of-charge fix. The customer accepts (repair continues at
no extra cost) or declines (repair is cancelled and a refund is owed). Parts
bought to put the mistake right are recorded as pure shop expense and surface
in the error report. A repair can hit more than one of these in sequence.

### Bills & payments

The bill builder composes an invoice from line items, applies a percentage or
flat discount, and controls per-field what prints — device, status, issue,
solution, technician, warranty, notes, payment details, tracking QR. It renders
on screen and as a PDF via `@react-pdf/renderer`.

Payment is bank-transfer-first, which is how the shop actually gets paid:
the invoice shows the account to pay into, the customer uploads a receipt, and
the shop verifies or rejects it from a queue. Cash is a one-click mark-as-paid.
Once settled, the same document becomes a receipt with a PAID stamp.

### Loyalty

`DiscountRule` rows map a completed-repair count to a discount percent
(the seed sets up 3 repairs → 5%, 5 repairs → 10%). The highest qualifying
active rule wins. Rules are editable from the admin panel.

### Storefront & reviews

Accessories and pre-owned phones with stock, images and a visibility flag —
the phones category can be hidden wholesale from a setting. Orders are placed
against a customer account and move `PENDING → PAID → FULFILLED`.

Reviews are submitted from `/feedback` (or added by an admin for walk-ins) and
stay `PENDING` until approved; approved ones can be featured and reordered on
the home page.

### Accounts & access

Auth.js v5 with credentials and JWT sessions. Middleware guards `/admin` by
role and every customer area by sign-in, and bounces signed-in users off the
marketing landing page into their own workspace. Password reset is a 6-digit
emailed OTP with a hashed, expiring code. Admins can block an account; the
blocked customer can request to be unblocked.

### Notifications

In-app notifications with an unread bell, plus transactional email through
Resend. Email is entirely optional — leave the API key unset and the in-app
notifications carry on working.

### Uploads

Photos go to Vercel Blob in production and to `public/uploads` on disk in local
dev, with no config needed to switch. Images are downscaled in the browser
before upload so they fit inside the serverless body limit.

---

## Tech stack

| | |
| --- | --- |
| **Framework** | Next.js 15 (App Router, Server Components, Server Actions) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui, Radix UI, `next-themes` |
| **Database** | PostgreSQL via Prisma 6 |
| **Auth** | Auth.js v5 (`next-auth@beta`), credentials + JWT, bcrypt |
| **Validation** | Zod |
| **Files** | Vercel Blob (prod) / local disk (dev) |
| **PDF** | `@react-pdf/renderer` |
| **Email** | Resend (optional) |
| **Hosting** | Vercel + Neon Postgres |

---

## Project structure

```
prisma/
  schema.prisma          # Users, tickets, payments, products, orders, reviews…
  migrations/
  seed.ts                # Demo shop: admin, customer, products, 5 repairs
scripts/
  migrate-deploy.mjs     # Runs migrations on Vercel using Neon's direct URL
  db-pull.mjs            # Copies production data down into the local DB
src/
  app/
    (marketing)/         # Landing page, storefront, public tracker
    (auth)/              # Login, register, forgot password
    (app)/               # Customer: dashboard, repairs, orders, profile, feedback
    admin/               # Repairs, bills, payments, products, customers,
                         # loyalty, reviews, reports, notes, errors, settings
    bill/[id]/           # The customer-facing invoice / receipt
  components/            # Shared UI, forms, status timeline, bill document
  lib/
    actions/             # Server actions, grouped by domain
    bill.ts              # Invoice shaping, warranty dates, field visibility
    loyalty.ts           # Discount tier resolution
    config.ts            # Shop details, warranty terms, canonical site URL
  auth.ts, middleware.ts # Auth.js setup and route protection
```

---

## Running it locally

**Requirements:** Node 20+, Docker (or any PostgreSQL 17 instance).

```bash
# 1. Database
docker run -d --name mobilux-db \
  -e POSTGRES_USER=mobilux -e POSTGRES_PASSWORD=mobilux_dev -e POSTGRES_DB=mobilux \
  -p 5432:5432 -v mobilux-pgdata:/var/lib/postgresql/data \
  postgres:17-alpine

# 2. Install and configure
npm install
cp .env.example .env          # defaults already match the Docker container above
npx auth secret               # generate AUTH_SECRET, then paste it into .env

# 3. Schema and demo data
npx prisma migrate dev
npm run db:seed

# 4. Go
npm run dev                   # http://localhost:3000
```

The seed creates an admin account, a customer with five repairs at different
stages, seven products and two loyalty tiers. It **prints both sign-in
credentials to your terminal** when it finishes — they're local development
accounts only, so change the admin password before any real deployment.

> **Port 5432 already taken?** On Windows, Hyper-V sometimes reserves it. Map
> the container to another port (`-p 5433:5432`) and update `DATABASE_URL`.

---

## Environment variables

Copy `.env.example` to `.env`. Only the first two are required.

| Variable | Required | What it's for |
| --- | :---: | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (local Docker, or Neon's pooled URL) |
| `AUTH_SECRET` | ✅ | Session signing key — generate with `npx auth secret` |
| `AUTH_TRUST_HOST` | | Set to `true` behind a proxy (needed on Vercel) |
| `NEXT_PUBLIC_APP_URL` | | Canonical URL for emails, QR codes and OG tags |
| `BLOB_READ_WRITE_TOKEN` | | Vercel Blob storage. Unset in dev → uploads go to `public/uploads` |
| `RESEND_API_KEY` | | Transactional email. Unset → email is skipped, in-app notifications still fire |
| `EMAIL_FROM` | | Sender shown to customers; the domain must be verified in Resend |
| `PROD_DATABASE_URL` | | Read-only production URL, used only by `npm run db:pull` |

Never commit `.env` — it's gitignored, and it holds live database credentials.

---

## Database workflows

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Create and apply a migration from schema changes |
| `npm run db:push` | Push the schema without a migration (quick prototyping) |
| `npm run db:seed` | Seed the demo shop (skips tickets if any already exist) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:pull` | Copy production data down into the local DB for testing |

Local and production are separate databases. `db:pull` reads from
`PROD_DATABASE_URL` and writes into `DATABASE_URL` — never the other way round.

---

## Deploying to Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. In the project's **Storage** tab:
   - Add **Neon Postgres** from the marketplace — this sets `DATABASE_URL`.
   - Add a **Blob** store — this sets `BLOB_READ_WRITE_TOKEN`.
3. In **Settings → Environment Variables** add:
   - `AUTH_SECRET` — from `npx auth secret`
   - `AUTH_TRUST_HOST` = `true`
   - `NEXT_PUBLIC_APP_URL` — your production URL, no trailing slash
   - `RESEND_API_KEY` and `EMAIL_FROM`, if you want the emails
4. Deploy. `vercel-build` runs `scripts/migrate-deploy.mjs` before the build,
   which derives Neon's direct (non-pooled) connection from `DATABASE_URL` and
   applies migrations — so no separate `DIRECT_URL` is needed.
5. Create the first admin once, from your machine:

   ```bash
   DATABASE_URL="<neon-url>" npm run db:seed
   ```

   Then sign in and change that password immediately.

---

## Before going live

- **Change the seeded admin password.** The seed's credentials are public — they
  are in this repository.
- **Set the real bank account.** Defaults live in
  [`src/lib/config.ts`](src/lib/config.ts); the shop can add and switch between
  several accounts under **Admin → Settings**, which override the default.
- **Check the shop details** in the same file — name, phone, email, WhatsApp
  number, opening hours, warranty period and warranty terms. These print on
  every bill.
- **Point `NEXT_PUBLIC_APP_URL` at production.** Printed bills carry a QR code
  to the tracker, and it's built from this value.
- **Verify your sending domain in Resend** before relying on customer emails —
  the fallback sender is for testing only.

---

<div align="center">
<sub>Built for a repair shop in Colombo, Sri Lanka.</sub>
</div>
