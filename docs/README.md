# Mobilux documentation

| Document | For | What it is |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | Technical design — actors, layers, data model, auth, security, deployment, known limitations |
| [OPERATIONS.md](OPERATIONS.md) | You | Reference manual — every env var, deploying, verifying, backups, the demo instance |
| [INSTALL-RUNBOOK.md](INSTALL-RUNBOOK.md) | You | The checklist you actually follow, per shop, start to finish |
| [HANDOVER.md](HANDOVER.md) | Shop owners | What to leave with a shop after training — Settings, logging a repair, billing, staff |
| [PRIVACY.md](PRIVACY.md) | Shop owners, you | What's stored, where, for how long, and who's responsible for it |
| [PRICING-WORKSHEET.md](PRICING-WORKSHEET.md) | You | A method for pricing setup + monthly — not numbers, a way to reach your own |
| [DEMO-POST.md](DEMO-POST.md) | You | Shot list and ready-to-adapt copy for the week 6 demo post |
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
- **Staff / repairman** — the bench and the counter. Repairs and billing, but
  no reports, no settings, no deletions, and their own sign-in door at
  `/staff/login`.
- **Admin / shop owner** — everything, including money and configuration.

## Assets

- `screenshots/` — product screenshots (seeded demo data, no real customer PII)
- `linkedin/` — marketing images and post copy
