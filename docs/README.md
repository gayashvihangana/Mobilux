# Mobilux documentation

| Document | For | What it is |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | Technical design — actors, layers, data model, auth, security, deployment, known limitations |
| [SHIPPING-PLAN.md](SHIPPING-PLAN.md) | You | Six weeks of work to a sellable product, at ~20 hrs/week |
| [PROPOSAL.md](PROPOSAL.md) | Shop owners | Commercial proposal. Fill in the `[[…]]` markers before sending |
| [REPORT.md](REPORT.md) | University | Academic report. Sections marked ✍️ **YOU** need your own evidence |
| [../README.md](../README.md) | Anyone | Feature tour, setup, environment variables, deployment |

Not in this folder: `SECURITY-AUDIT.md` lives at the repo root and is
**gitignored** — it enumerates residual weaknesses and should not be published.

## The three actors

Everything is organised around these. See
[ARCHITECTURE.md §2](ARCHITECTURE.md#2-actors--permissions) for the full
permission matrix.

- **Customer** — device owner. Tracks their own repair, pays, reviews.
- **Staff / repairman** 🔜 — the bench and the counter. Repairs and billing, but
  no reports, no settings, no deletions. *Schema value exists; not yet
  implemented — week 3 of the plan.*
- **Admin / shop owner** — everything, including money and configuration.

## Assets

- `screenshots/` — product screenshots (seeded demo data, no real customer PII)
- `linkedin/` — marketing images and post copy
