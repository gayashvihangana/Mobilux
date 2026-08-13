# Mobilux documentation

| Document | For | What it is |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | Technical design — actors, layers, data model, auth, security, deployment, known limitations |
| [OPERATIONS.md](OPERATIONS.md) | You | Reference manual — every env var, deploying, verifying, backups, the demo instance |
| [INSTALL-RUNBOOK.md](INSTALL-RUNBOOK.md) | You | The checklist you actually follow, per shop, start to finish |
| [HANDOVER.md](HANDOVER.md) | Shop owners | What to leave with a shop after training — Settings, logging a repair, billing, staff |
| [PRIVACY.md](PRIVACY.md) | Shop owners, you | What's stored, where, for how long, and who's responsible for it |
| [PROPOSAL.md](PROPOSAL.md) | Shop owners | Commercial proposal. Fill in the `[[…]]` markers before sending |
| [SHIPPING-PLAN.md](SHIPPING-PLAN.md) | Anyone curious | Six weeks from "it works on my machine" to something sellable — and an honest log of what broke on the way |
| [../README.md](../README.md) | Anyone | Feature tour, setup, environment variables, deployment |

**Start with [SHIPPING-PLAN.md](SHIPPING-PLAN.md)** if you want to know what
this project is really like rather than what it claims. It records the
authentication hole found by actually testing the security work, the
discovery that a 6-hour backup window is not a backup, and the week the
staff sign-in page turned out to have been broken in every browser while
every automated check reported success.

## Not in this repo

A few documents are kept on disk but untracked (see `.gitignore`), because
nobody reading the code needs them: `docs/PRICING-WORKSHEET.md` and
`docs/DEMO-POST.md` are commercial material, and `docs/REPORT.md` is a
write-up templated as a university submission, which this project is not.
`SECURITY-AUDIT.md` at the repo root has never been committed; it
enumerates residual weaknesses and is not for publication.

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
