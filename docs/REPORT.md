# Mobilux — Project Report

**A web-based repair management and customer tracking system for phone repair shops**

**Author:** [[your name]] · **Institution:** [[institution]] · **Supervisor:** [[supervisor]]
**Submitted:** [[date]]

---

> ### How to use this document
>
> Sections marked **✍️ YOU** must be written by you — they need evidence I don't
> have (what you actually tested, what real users said, how long things took,
> what you'd do differently). Writing those yourself is also the point of the
> exercise.
>
> Everything else is drawn from the codebase and is factually accurate as of
> 31 July 2026. Check it against your institution's required structure and
> re-order to match — marking schemes vary and this one is generic.
>
> **Do not submit with `[[…]]` markers still in it.**

---

## Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Literature & existing systems review](#3-literature--existing-systems-review) ✍️
4. [Requirements](#4-requirements)
5. [Methodology](#5-methodology) ✍️
6. [System design](#6-system-design)
7. [Implementation](#7-implementation)
8. [Testing & verification](#8-testing--verification)
9. [Evaluation](#9-evaluation) ✍️
10. [Conclusion & future work](#10-conclusion--future-work)
11. [References](#11-references) ✍️
12. [Appendices](#12-appendices)

---

## 1. Abstract

Small phone repair businesses in Sri Lanka typically manage repairs using paper
records and instant messaging. This creates three recurring problems: customers
have no way to check progress without telephoning the shop, repair history and
profitability are difficult to reconstruct, and disputes over price or warranty
have no supporting record.

This project presents Mobilux, a web-based repair management system addressing
these problems through a single application serving three distinct user roles —
customer, technician and shop owner. The system provides customer-facing repair
tracking that requires no user account, an itemised billing system, bank-transfer
payment verification suited to a market where card payment is uncommon, and
back-office tools for parts costing, profitability reporting and staff access
control.

The system is implemented using Next.js 15 with React Server Components,
PostgreSQL via the Prisma ORM, and JWT-based authentication. A notable design
challenge addressed is stateless session revocation: because JSON Web Tokens
cannot be invalidated server-side, a database-backed validity cut-off was
introduced so that administrative actions such as blocking an account take effect
immediately rather than on token expiry.

The system has been deployed and used in a live repair business.

> ✍️ **YOU** — add one or two sentences of results once you have evaluation
> data (§9): e.g. how many repairs processed, what users reported.

---

## 2. Introduction

### 2.1 Background

Sri Lanka has a large informal phone repair sector: small independent shops,
typically one to five staff, handling screen replacements, battery service, water
damage recovery and board-level work. These businesses operate on thin margins
and high volume.

Their record-keeping is almost entirely manual. A repair is written into a
notebook when the device arrives; the customer is given a slip with a number;
progress updates happen by telephone or WhatsApp. Parts are bought from several
suppliers and their costs recorded, if at all, separately from the repair.

### 2.2 Problem statement

Manual record-keeping in this context produces measurable operational costs:

1. **Interruption cost.** Progress enquiries by telephone interrupt technicians
   at the bench. Each interruption has a cost beyond its duration.
2. **Traceability loss.** A repair's full history — what was wrong, what was
   done, what parts were used, what was quoted, what was paid — is distributed
   across a notebook, a message thread and the technician's memory.
3. **Unmeasurable profitability.** Because parts cost and customer payment are
   recorded separately, per-repair profit is not readily calculable, so pricing
   decisions are made without data.
4. **Undocumented disputes.** Disagreements about quoted price, warranty scope,
   or damage occurring during repair have no authoritative record.
5. **No customer retention mechanism.** Repeat customers are not systematically
   identified or rewarded.

### 2.3 Aim

To design, implement and deploy a web-based system that provides a single
authoritative record of every repair, gives customers self-service access to
progress information, and gives the shop owner accurate cost and revenue data.

### 2.4 Objectives

1. Model the repair lifecycle as an explicit, auditable state machine.
2. Provide customer progress tracking that works **without requiring an account**,
   since many walk-in customers have no email address.
3. Implement itemised billing producing a printable invoice.
4. Support bank transfer payment with receipt upload and shop-side verification,
   appropriate to a market where card payment is uncommon.
5. Record parts cost per repair to enable per-repair profitability reporting.
6. Provide role-based access so technicians can operate the bench without access
   to financial reporting.
7. Provide a documented process for handling damage occurring during a repair.
8. Secure the system to a standard appropriate for storing customer personal data.

### 2.5 Scope

**In scope:** repair intake and tracking, customer accounts, billing and invoice
generation, bank-transfer payment verification, parts and cost recording,
accessories storefront, loyalty discounts, customer reviews, reporting, role-based
access control.

**Out of scope:** card payment gateway integration, native mobile applications,
multi-branch inventory, accounting-package integration, supplier ordering.

---

## 3. Literature & existing systems review

> ✍️ **YOU** — this section requires your own research and is usually heavily
> weighted. Suggested structure:
>
> - **Existing commercial systems.** Review 3–5 repair-shop management products
>   (e.g. RepairShopr, RepairDesk, Orderry, mHelpDesk). For each: features,
>   pricing model, and why it does not fit a small Sri Lankan shop — most price
>   in USD per user per month, assume card payment, and assume every customer
>   has an email address.
> - **The gap.** Argue what is missing: no-account customer tracking,
>   bank-transfer-first payment, affordability at Sri Lankan margins.
> - **Relevant academic work.** Search for literature on job-tracking systems,
>   SME digital adoption in developing economies, and self-service status
>   tracking. Cite properly.
> - **Technical literature.** Justify your stack choices with sources — server-side
>   rendering, stateless vs stateful sessions, ORM trade-offs.

---

## 4. Requirements

Requirements were derived from direct operation of a repair business rather than
from surveying third parties.

> ✍️ **YOU** — state your elicitation method honestly in §5. "I own and operate
> the business the system was built for" is a legitimate and defensible method
> (participant-observer / action research); say so explicitly rather than
> implying a formal survey took place.

### 4.1 Functional requirements

#### Customer

| ID | Requirement | Priority |
|---|---|---|
| FR-C1 | Submit a repair request online with photographs | Must |
| FR-C2 | View a live status timeline for their own repairs | Must |
| FR-C3 | Track a repair **without an account**, using a link or ticket number | Must |
| FR-C4 | View and print an itemised invoice | Must |
| FR-C5 | Upload a bank transfer receipt against a bill | Must |
| FR-C6 | Accept or decline a shop-reported issue during repair | Must |
| FR-C7 | Receive email and in-app notification on status change | Should |
| FR-C8 | Earn a loyalty discount based on completed repairs | Should |
| FR-C9 | Purchase accessories from a storefront | Could |
| FR-C10 | Submit a review after a completed repair | Could |

#### Staff / technician

| ID | Requirement | Priority |
|---|---|---|
| FR-S1 | Create a repair record for a walk-in customer with no account | Must |
| FR-S2 | Advance, and correct, a repair's status | Must |
| FR-S3 | Record parts used, supplier and cost | Must |
| FR-S4 | Record items received with the device | Should |
| FR-S5 | Build and issue an itemised bill | Must |
| FR-S6 | Verify or reject a customer's payment receipt | Must |
| FR-S7 | Report an issue occurring during repair and record the outcome | Should |

#### Administrator / owner

| ID | Requirement | Priority |
|---|---|---|
| FR-A1 | All staff capabilities | Must |
| FR-A2 | View revenue, volume and per-repair profitability reports | Must |
| FR-A3 | Configure shop identity, contact details and bank accounts | Must |
| FR-A4 | Create and deactivate staff accounts | Must |
| FR-A5 | Block and unblock customer accounts | Should |
| FR-A6 | Delete repair records | Should |
| FR-A7 | Moderate customer reviews before publication | Should |
| FR-A8 | Manage the storefront catalogue and stock | Could |

### 4.2 Non-functional requirements

| ID | Requirement | How addressed |
|---|---|---|
| NFR-1 | Passwords stored irreversibly | bcrypt, cost factor 12 |
| NFR-2 | Revoked access takes effect immediately | DB validity cut-off (§6.4) |
| NFR-3 | Resistant to credential brute-forcing | Fixed-window rate limiting, per IP and per account |
| NFR-4 | Customer data not exposed to other customers | Ownership re-checked against DB on every access |
| NFR-5 | Public tracking must not leak internal notes | Restricted projection, enforced by type system (§7.3) |
| NFR-6 | Usable on a mobile browser at the bench | Responsive throughout |
| NFR-7 | Deployable per shop without code changes | Environment + database configuration |
| NFR-8 | No known vulnerable dependencies | `npm audit` clean at submission |
| NFR-9 | Operate within free hosting tiers at small-shop volume | Serverless, managed Postgres |

---

## 5. Methodology

> ✍️ **YOU** — describe honestly:
>
> - **Development approach** — iterative/incremental. This was built feature by
>   feature against real use in a working shop, which is closer to action
>   research than to a waterfall or formal Agile process. Say that, and justify
>   it: requirements were validated by daily operational use rather than by
>   review meetings.
> - **Requirements elicitation** — participant-observer. State the bias risk
>   this introduces (a single shop's workflow may not generalise) and how you'd
>   mitigate it (the shipping plan's first-buyer onboarding is exactly this test).
> - **Tools** — Git, VS Code, Prisma Studio, Vercel, Docker.
> - **Timeline** — your actual milestones. Git history gives you real dates:
>   `git log --pretty="%ad %s" --date=short`
> - **Ethical considerations** — this system stores real customers' names, phone
>   numbers, device details and photographs. Explain consent, and why the
>   screenshots in this report use seeded data rather than real records.

---

## 6. System design

Full technical detail in [ARCHITECTURE.md](ARCHITECTURE.md). This section
summarises the design decisions that matter academically.

### 6.1 Architectural style

A server-rendered monolith using React Server Components, with mutations
expressed as server actions rather than a REST or GraphQL API.

**Justification.** A separate API layer exists to serve multiple clients. This
system has exactly one client — its own web front end — with no mobile
application or third-party integration in scope. Introducing an API would add a
serialisation boundary, duplicate validation, and a second place for
authorisation bugs to hide, in exchange for flexibility that has no consumer.
Data is therefore fetched in the component that renders it, and mutations are
called directly from forms.

**Trade-off acknowledged:** should a mobile application enter scope, an API layer
would have to be retrofitted.

### 6.2 Deployment model: instance-per-tenant

Each shop receives a separate deployment with its own database, rather than
sharing one database with tenant-discriminating columns.

**Justification.** Row-level multi-tenancy makes every query a potential data
leak: a single omitted `WHERE shop_id = ?` exposes one shop's customers to
another. Physical separation makes that class of defect impossible rather than
merely unlikely. At the target scale — small shops, low volume — the cost is
zero, since each instance fits within free hosting tiers.

**Trade-off acknowledged:** provisioning and updating are per-instance
operations, which does not scale past a few dozen tenants without automation.

### 6.3 Data model

14 entities. See [ARCHITECTURE.md §4](ARCHITECTURE.md#4-data-model) for the full
diagram.

Design decisions worth defending in a viva:

- **`RepairTicket.customerId` is nullable.** Walk-in customers frequently have no
  email address and therefore no account. Making the relationship optional was
  necessary to model the real business; it is the source of considerable
  branching elsewhere.
- **Two identifiers per repair.** A sequential human-readable number
  (`MBX-0044`) for verbal and printed use, and a cryptographically random token
  for the public tracker. The sequential identifier is enumerable by design;
  keeping tracking on a separate unguessable key prevents that becoming a
  disclosure vector.
- **Monetary values as `DECIMAL(10,2)`**, never floating point, to avoid
  representation error in financial totals.
- **Derived rather than entered costs.** Total parts cost is computed from the
  parts list rather than typed, so the recorded figure cannot contradict the
  itemised log behind it.

### 6.4 Session revocation with stateless tokens

The most technically interesting problem in the project.

**Problem.** JSON Web Tokens are self-contained and bearer-based: the server
validates a signature, not a stored record. There is consequently nothing to
delete when access should end. With the framework default of a 30-day lifetime,
blocking an abusive customer, demoting a dismissed technician, or a customer
changing their password after a device theft would have had **no effect for up to
a month**.

**Options considered.**

| Option | Rejected because |
|---|---|
| Database-backed sessions | Cannot be read in edge middleware, which is where the framework's routing guard runs |
| Very short token lifetime | Reduces the window but never closes it; also forces frequent re-authentication |
| Token blocklist | Requires shared state anyway, and grows unboundedly |

**Solution adopted.** A hybrid. Each user record carries a `sessionsValidFrom`
timestamp. Every protected request performs one indexed lookup and rejects any
token whose issued-at claim precedes that cut-off. The cut-off is advanced on
blocking, password change and password reset. Token lifetime was additionally
reduced to eight hours to bound the window for a stolen cookie.

This restores the revocability of stateful sessions at the cost of one
primary-key lookup per request — negligible beside the queries the pages
themselves already perform.

### 6.5 Least-privilege access design

Three roles, with staff deliberately denied access to financial reporting and
configuration. The design principle is that a technician should be able to do
their entire job without the ability to see the business's revenue or to destroy
records.

Authorisation is enforced at three layers, of which only the latter two are
trusted: edge middleware (routing convenience), layout guards, and — critically —
**within every server action**. A server action is a publicly reachable endpoint
and must never assume a page-level guard has run.

---

## 7. Implementation

### 7.1 Technology stack and justification

| Layer | Technology | Justification |
|---|---|---|
| Framework | Next.js 15, React 19 | Server Components reduce client JavaScript; server actions remove the need for a separate API |
| Language | TypeScript (strict) | Compile-time guarantees; see §7.3 for a security property enforced by the type system |
| Database | PostgreSQL | Relational integrity, exact decimal arithmetic, JSON columns where appropriate |
| ORM | Prisma | Type-safe queries generated from a single schema; migrations as reviewable SQL |
| Authentication | Auth.js v5 | Standards-based, avoids implementing session handling from scratch |
| Styling | Tailwind CSS v4 | Consistency without a separate stylesheet architecture |
| Hosting | Vercel + Neon | Free tier adequate at target volume; managed backups |

### 7.2 The repair state machine

Ten states with explicit transition rules. Every transition writes an immutable
timeline entry, making the timeline itself the repair's audit trail.

A design decision worth noting: **backward transitions are treated as
corrections, not as progress**. Moving a repair back to an earlier state rewinds
the timeline — deleting the entries it contradicts — and deliberately does *not*
notify the customer. A customer receiving "ready for collection" followed by
"currently being repaired" would reasonably lose confidence; a shop correcting
its own mis-click should not generate that message.

### 7.3 Enforcing a privacy boundary through the type system

The public tracker must not expose technicians' internal notes, which in practice
contain customer telephone numbers, device passcodes and addresses.

Rather than filtering these fields at render time behind a boolean flag — which a
future edit could bypass — the query for public data selects a restricted column
set that does not include them, and the timeline component's prop type was
narrowed to match. Any future change attempting to render an internal note on the
public page therefore **fails to compile** rather than silently leaking data.

This was validated during development: the compiler rejected the first
implementation for precisely this reason.

### 7.4 Damage-during-repair process

An unusual feature: an explicit workflow for the shop's own mistakes. The shop
records what went wrong and optionally offers a free remedy; the customer accepts
(the repair continues at no charge) or declines (the repair is cancelled and a
refund recorded). Only one such issue may await a decision at a time. An
administrator may record the decision on the customer's behalf, since many
customers are walk-ins who respond in person or by telephone.

This exists because the alternative — an undocumented conversation — is where
disputes and reputational damage originate.

### 7.5 Security implementation

| Control | Implementation |
|---|---|
| Password storage | bcrypt, cost 12 |
| Session revocation | §6.4 |
| Brute-force resistance | Fixed-window counters in PostgreSQL, applied per IP and per account, evaluated *before* password hashing so an attacker cannot consume server CPU cheaply |
| Availability under failure | The rate limiter fails **open**: a database fault must not lock a shop out of its own system |
| Enumeration resistance | Random tracking tokens; identical error responses for all lookup failure modes |
| Injection | Parameterised queries throughout (ORM); the single raw query uses a parameterised template |
| Cross-site scripting | Framework escaping; structured-data blocks unicode-escaped |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options` |
| Transport | HSTS with preload |

A full security audit was conducted against the codebase and is retained
separately (not published, as it enumerates residual weaknesses).

---

## 8. Testing & verification

> ⚠️ **Report this honestly.** There is no automated test suite. Do not claim
> one. An examiner will check, and the absence is defensible if you state it
> and analyse it — see §8.3.

### 8.1 Verification performed

| Method | Coverage |
|---|---|
| Static type checking (`tsc --noEmit`) | Whole codebase, zero errors |
| Production build | Whole codebase, all 31 routes compile |
| Dependency vulnerability scan (`npm audit`) | Zero known vulnerabilities in production dependencies |
| Manual functional testing | All primary user journeys |
| Live operational use | The system has processed real repairs in a working business |

### 8.2 Test cases

> ✍️ **YOU** — write these up as a proper table: ID, precondition, steps,
> expected result, actual result, pass/fail. Cover at minimum:
>
> - Authentication: valid login, invalid login, blocked account, rate limit
>   triggering and expiring
> - Authorisation: customer attempting to open another customer's repair; staff
>   attempting to open reports; unauthenticated access to `/admin`
> - Session revocation: block a signed-in customer, confirm ejection on next
>   request
> - Public tracking: valid token, invalid token, ticket number with correct and
>   incorrect phone digits; confirm internal notes absent from the response
> - Repair lifecycle: each transition, plus a backward correction
> - Billing: itemised bill totals, percentage and fixed discounts, PDF output
> - Payment: receipt upload, verification, rejection
>
> Include screenshots as evidence. The security verification checklist in
> [SHIPPING-PLAN.md §1.2](SHIPPING-PLAN.md#12-apply-and-verify-the-security-migration--4-h)
> maps directly onto test cases.

### 8.3 Limitations of the testing approach

The absence of an automated test suite is the project's principal engineering
weakness. Manual testing does not scale, is not repeatable, and provides no
regression protection: a change to the billing calculation could silently break
loyalty discounting with no signal until a customer is charged incorrectly.

Mitigating factors: strict static typing eliminates a large class of defect
before runtime, and the system has been exercised continuously by real
operational use, which surfaces defects that a test suite written by the same
developer might not anticipate.

This does not make the gap acceptable, only survivable at current scale.
Recommended remediation is in §10.2.

---

## 9. Evaluation

> ✍️ **YOU** — this section needs real data and is usually the difference
> between a good mark and a very good one. Suggested approach:
>
> **Quantitative.** From your own shop's records: number of repairs processed
> through the system; change in progress-enquiry telephone calls before and
> after; time to produce a bill by hand versus in the system. Even rough
> before/after figures from your own operation are legitimate evidence if you
> describe how you obtained them.
>
> **Qualitative.** Ask a small number of customers and any staff to use it and
> report back. Structure it — a short questionnaire, or System Usability Scale —
> so you have something citable rather than anecdote.
>
> **Against objectives.** Take each objective from §2.4 and assess honestly
> whether it was met, partially met, or not met. Objective 6 (role-based access)
> is **not yet met** in the submitted code — `STAFF` exists in the schema but is
> unused. Say so; a report that claims otherwise is a report that fails on
> inspection.
>
> **Against non-functional requirements.** NFR-1 through NFR-9 in §4.2 — state
> the evidence for each.
>
> **Threats to validity.** Requirements came from one shop, operated by the
> developer. Generalisability is unproven. Say so.

---

## 10. Conclusion & future work

### 10.1 Conclusion

> ✍️ **YOU** — write this last, after §9, and make it follow from your actual
> evidence. Cover: what was built, which objectives were met, what the principal
> technical contribution was (the session-revocation design in §6.4 and the
> type-enforced privacy boundary in §7.3 are the two most defensible), and what
> you learned.

### 10.2 Future work

Ordered by value, not by ease.

1. **Automated test suite.** The most important outstanding item (§8.3). Unit
   tests for the pure business logic — bill computation, loyalty tiers, status
   ordering — followed by integration tests for the authorisation boundaries.
2. **Role-based access control completion.** `STAFF` is defined but unused; the
   permission model in §6.5 is designed but not implemented.
3. **Audit logging.** No record currently identifies which user deleted a repair
   or marked a bill paid. This becomes essential the moment multiple staff
   accounts exist.
4. **Sinhala and Tamil localisation.** Probably the single largest barrier to
   adoption in the target market.
5. **Unified configuration.** Shop identity is presently split between
   build-time environment variables and database settings; these should be
   consolidated so a shop owner can change branding without redeployment.
6. **Revocable file access.** Uploaded receipts and photographs are stored at
   unguessable but permanent URLs with no revocation mechanism.
7. **Two-factor authentication** for administrative accounts, and rejection of
   passwords known to have appeared in public breaches.
8. **Provisioning automation** for deploying new shop instances.

---

## 11. References

> ✍️ **YOU** — in your institution's required citation style. You will need,
> at minimum: sources for the existing-systems review (§3), any academic work on
> SME digital adoption or job-tracking systems, and technical documentation for
> the major framework and security decisions you defend (Next.js, Auth.js, OWASP
> guidance on session management and password storage).

---

## 12. Appendices

### Appendix A — Entity-relationship diagram

> ✍️ Generate from `prisma/schema.prisma`. `prisma-erd-generator` produces one
> automatically, or draw it. Textual version in
> [ARCHITECTURE.md §4](ARCHITECTURE.md#4-data-model).

### Appendix B — Use-case and sequence diagrams

> ✍️ Required by most marking schemes. At minimum: a use-case diagram covering
> the three actors from §4.1, and sequence diagrams for two flows — repair
> submission through to collection, and payment upload through to verification.
> The flows in [ARCHITECTURE.md §7](ARCHITECTURE.md#7-key-flows) give you the
> content.

### Appendix C — Screenshots

Available in `docs/screenshots/`. **These use seeded demonstration data, not real
customer records** — state this explicitly in your ethics section.

### Appendix D — Database schema

`prisma/schema.prisma`.

### Appendix E — Deployment configuration

[ARCHITECTURE.md §9](ARCHITECTURE.md#9-deployment--environments) and `.env.example`.
