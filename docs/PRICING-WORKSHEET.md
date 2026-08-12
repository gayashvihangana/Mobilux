# Pricing worksheet

**What this is:** a structure for arriving at your own numbers, not a
number-generator. Nobody outside your market can tell you what a Colombo
repair shop will actually pay — but the shipping plan's framing (setup fee
anchored to what paperwork costs a shop, monthly priced for *you being
reachable*, not for hosting) gives you a real method. Work through this once,
then copy the results straight into [PROPOSAL.md](PROPOSAL.md)'s `[[…]]`
markers.

---

## 1. What the old way actually costs a shop

This is your anchor for the **setup fee**. Not your hours — what a week of
paper-book chaos costs *them*. Estimate, don't guess wildly; even a rough
number beats pricing against your own labour.

| Question | Their answer (estimate is fine) |
|---|---|
| How many repairs does a typical shop like this do per week? | `[[ ]]` |
| At LKR `[[ ]]` average ticket value, what's a week of repairs worth? | `[[ ]]` |
| If a device is mis-logged or a customer dispute goes undocumented, how often does that cost a *whole repair's worth* of goodwill or a refund? Once a month? Once a quarter? | `[[ ]]` |
| How many phone calls a day are "is it ready yet?" How much technician time does that actually eat? | `[[ ]]` |
| Would they say a repeat customer notices whether they're recognised, or not? | `[[ ]]` |

**The number that matters:** if losing track of even one repair a month
costs LKR `[[X]]` in redone work, refunds or a customer who never comes
back, your setup fee should read as *cheap insurance against that*, not as
"a website." Price it there, not against how many hours you spent building
it — your hours already happened; theirs are what you're saving.

## 2. Your actual monthly cost, per shop

This is the floor under the **monthly plan** — you should never price below
what it costs you to keep a shop running, even before your own time counts
for anything.

| Cost | At what usage | LKR/month (your estimate) |
|---|---|---|
| Vercel hosting | Free tier, until a shop is genuinely busy — [[at what point does a shop outgrow it? Check Vercel's current free-tier limits before pricing]] | `[[ ]]` |
| Neon database | Free tier limits — same check | `[[ ]]` |
| Vercel Blob storage | Free tier limits | `[[ ]]` |
| Resend (email) | Free tier sends/month | `[[ ]]` |
| Your time, budgeted | Even a small monthly allowance for "things break, I fix them" | `[[ ]]` |
| **Floor total** | | `[[ ]]` |

Most of the above stays LKR 0 per shop until they're busy enough to matter —
which is exactly why the plan says the monthly fee is mostly **not** a
hosting bill. It's what a shop pays so that when something breaks on a
Saturday, you answer. Price the interruption, not the electricity.

## 3. What "support" actually includes

Vague terms create disputes later. Decide, in writing, what the monthly buys
and what's billed separately — this becomes the "what's included in setup"
and "what isn't" lines in the proposal.

- [ ] Response time you're committing to (same day? next business day?)
- [ ] What counts as "the system is broken" vs. "a change request" — e.g. is
      renaming a Settings field free, is adding a new bill line item type a
      paid change?
- [ ] Days of free support included with the setup fee, before the monthly
      kicks in — `[[N]]`
- [ ] What happens if they stop paying the monthly — the proposal already
      says the system keeps running; confirm that's really your intent

## 4. Sanity checks before you send a number

- **Compare to what they're already not paying for.** A shop currently pays
  LKR 0/month for a paper book. The monthly fee has to read as obviously
  worth it against the cost in §1, not just "affordable."
- **Compare to a competitor**, if you know of one serving this market —
  RepairShopr/RepairDesk-style products price in USD/user/month, which is
  usually wildly wrong for this market. If you're cheaper *and* built for
  bank transfers and no-account customers, say both.
- **Decide your first-shop discount now, deliberately**, rather than
  improvising a discount live in a sales conversation. Onboarding shop #1
  ([SHIPPING-PLAN.md §6.3](SHIPPING-PLAN.md)) is worth more to you as a
  reference and a bug-finding session than its sticker price.
- **Set the proposal's validity window** — `[[N]] days` in
  [PROPOSAL.md](PROPOSAL.md)'s footer — so a stale quote doesn't bind you to
  a price after your costs (or Vercel/Neon's free tier terms) change.

## 5. Where the results go

Once you've filled this in, these are the exact markers waiting in
[PROPOSAL.md](PROPOSAL.md):

- `[[LKR amount]]` — setup fee (§107)
- `[[LKR amount]]/month` — monthly support (§108)
- `[[number]] days of support afterwards` (§118)
- `[[N]]` — backup retention days you can honestly promise (§128, pull this
  from whatever you actually set in
  [OPERATIONS.md §4.2](OPERATIONS.md#42-turn-it-on) for that shop)
- `[[N]]` days — proposal validity (§172 footer)
- `[[Your name]]`, `[[phone]]`, `[[email]]`, `[[demo link]]` (§95, §167-168)

---

<sub>Pricing worksheet version 1.0 · 7 August 2026</sub>
