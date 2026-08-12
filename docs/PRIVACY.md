# Privacy — what's stored, where, and for how long

**This is not a legal document.** It's the honest, plain-language account of
what the system actually stores, for two audiences: the shop owner, who is
legally the data controller for their own customers' information, and you as
the processor running the infrastructure underneath them. If a shop's lawyer
wants a formal policy for their own site, this is the factual starting point,
not a substitute.

## Who is responsible for what

**The shop owner controls the data.** They decide what's collected, who sees
it, and how long to keep a customer around — the same way a paper repair
book always worked. **You (the installer/host) process it on their behalf** —
you run the server and the database, but you don't decide what a shop does
with its own customers' information, and you don't access it except to keep
the system running or fix a problem the shop asks you to fix.

Each shop's data lives in its **own, separate database** — see
[ARCHITECTURE.md §1](ARCHITECTURE.md#1-system-overview). There is no shared
customer list across shops; a shop's data is never visible to, or mixed with,
another shop's.

## What's actually stored

| Category | Fields | Notes |
|---|---|---|
| **Account** | Name, email, phone, a bcrypt hash of the password (never the password itself) | Customers create their own; walk-ins can be logged with just a name, no account at all |
| **Repair record** | Device type/brand/model, the problem described, photos, what was done, parts used and their cost, who worked on it | Photos are uploaded files (see Files, below) |
| **Notes** | Internal technician notes on a repair | **Never shown to the public tracker** — only the shop and, for their own repairs, the customer who owns it. These sometimes contain a phone number, an address, or a device passcode, because that's what actually gets written down at a bench |
| **Billing** | Itemised bill lines, amounts, discounts, payment method, a bank-transfer receipt image if one was uploaded | |
| **Activity** | Sign-in timestamps, and — since week 4 — a record of who deleted a repair or moved money (`AuditLog`), for the shop's own accountability | Not shown to customers |
| **Rate-limit counters** | IP address, tied to a short time window | Transient — cleared automatically once the window passes, not a standing log of visitors |

## Where it lives

- **Database:** PostgreSQL, hosted by Neon, region `[[region — set per shop,
  e.g. ap-southeast-1 / Singapore]]`.
- **Files** (photos, receipts): Vercel Blob, same hosting provider as the
  site itself.
- **Email:** sent through Resend, only to the address the customer or shop
  provided, only for a transactional reason (status change, payment result,
  password reset) — never marketing, and the demo instance never sends email
  at all (no API key configured there).

Neither provider is chosen by the customer — they're the shop's
infrastructure, in the same way a physical repair book lives in a specific
shop's specific drawer.

## How long it's kept

- **Live data** stays for as long as the shop keeps running the system —
  there's no automatic deletion of old repairs or customer accounts.
- **Backups:** two layers. The database's own point-in-time history covers
  only the last **6 hours** on the current plan; the real coverage is a
  **nightly encrypted snapshot kept for 90 days**
  (`.github/workflows/backup.yml`). So a customer's data can persist in a
  backup for up to 90 days after it is deleted from the live system — a shop
  closing an account does not retroactively purge those. See
  [OPERATIONS.md §4](OPERATIONS.md#4-backups-and-recovery).
- **If a shop asks you to delete a customer's data**, or asks for an export
  of everything held on them, that's a manual request today — there's no
  self-service "export my data" or "delete my account" button yet
  ([SHIPPING-PLAN.md](SHIPPING-PLAN.md), after week 6).

## What's never collected

No card numbers (there is no card gateway — bank transfer only, see
[ARCHITECTURE.md §7.3](ARCHITECTURE.md#73-payment)), no location tracking, no
analytics or advertising trackers, no data sold or shared with anyone outside
the shop's own account.

---

<sub>Privacy note version 1.0 · 7 August 2026</sub>
