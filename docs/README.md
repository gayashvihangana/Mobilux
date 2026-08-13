# Mobilux documentation

| Document | For | What it is |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | Technical design — actors, layers, data model, auth, security, deployment, known limitations |
| [OPERATIONS.md](OPERATIONS.md) | You | Reference manual — every env var, deploying, verifying, backups, the demo instance |
| [INSTALL-RUNBOOK.md](INSTALL-RUNBOOK.md) | You | The checklist you actually follow, per shop, start to finish |
| [HANDOVER.md](HANDOVER.md) | Shop owners | What to leave with a shop after training — Settings, logging a repair, billing, staff |
| [PRIVACY.md](PRIVACY.md) | Shop owners, you | What's stored, where, for how long, and who's responsible for it |
| [PROPOSAL.md](PROPOSAL.md) | Shop owners | Commercial proposal. Fill in the `[[…]]` markers before sending |
| [../README.md](../README.md) | Anyone | Feature tour, setup, environment variables, deployment |

## Not in this repo

Some documents are kept on disk but **deliberately untracked** (see
`.gitignore`), because they are business or personal material rather than
anything needed to run or hand over the software:

| Document | What it is |
|---|---|
| `SECURITY-AUDIT.md` *(repo root)* | The residual open findings — a map of what is still weak |
| `docs/PRICING-WORKSHEET.md` | What a shop is worth to you, and how to reach that number |
| `docs/SHIPPING-PLAN.md` | The roadmap, including every known gap |
| `docs/REPORT.md` | An academic submission, personal to the author |
| `docs/DEMO-POST.md` | Unpublished marketing drafts |

If you have cloned this repo and one of the above is referenced somewhere,
that is why you cannot find it. Everything required to **build, deploy,
install and hand over** the product is tracked and present.

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
