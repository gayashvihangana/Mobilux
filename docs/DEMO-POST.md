# The demo post — copy, shot list, checklist

[SHIPPING-PLAN.md §6.2](SHIPPING-PLAN.md): a 30-second recording, the demo
link (not the source), posted to Sri Lankan phone-repair Facebook groups
rather than LinkedIn. Everything below is ready to adapt — fill in
`[[demo link]]` once the demo instance is actually live
([OPERATIONS.md §6.1](OPERATIONS.md#61-provisioning-once)), and drop your
own name/number wherever you'd naturally sign off in that group.

---

## Before you post: check the demo actually works

- [ ] `[[demo link]]` loads and shows **your** shop's branding, not
      "Your Shop" (see [OPERATIONS.md §2](OPERATIONS.md#2-deploying))
- [ ] The demo banner is visible — a shop owner clicking around should never
      wonder if this is a real business's real data
- [ ] All three one-click login buttons work (`/login` and `/staff/login`)
- [ ] It's been reset at least once (`npm run db:seed:demo` or wait for the
      nightly cron) so the data looks freshly busy, not picked-over
- [ ] You've clicked through the exact flow you're about to record, once,
      off-camera

## Shot list — 30 seconds, screen recording

Silent is fine; a repair shop owner scrolling Facebook has sound off.
Burned-in captions carry it.

1. **(0–5s)** Land on the demo link. Caption: *"This is what your repair
   shop could look like online."*
2. **(5–12s)** One-click sign in as **Staff**, land on the bench view.
   Caption: *"Your technician logs a repair — no revenue numbers, just the
   bench."*
3. **(12–18s)** Open a repair, move its status forward one step (e.g.
   Diagnosing → In Progress). Caption: *"Every step, tracked automatically."*
4. **(18–24s)** Switch to the one-click **Customer** login (or a second
   browser tab), show their tracker with the same repair's live status.
   Caption: *"Your customer sees this — instantly, no phone call."*
5. **(24–30s)** Show a printed/PDF bill with the shop's own branding and
   bank details on it. Caption: *"A real invoice, in about a minute."*

End card: `[[demo link]]` + your contact. Nothing longer — the plan is
right that 30 seconds is the target, not a walkthrough.

## Post copy

Pick one, or mix. All three assume the video is attached or linked directly
above the text.

### A — short, direct

> Built a repair-tracking system for phone repair shops — try it yourself,
> no signup needed: **[[demo link]]**
>
> Your customers track their own repair without calling you. You get an
> itemised bill in about a minute, and your technicians can log repairs and
> bill without seeing your profit numbers.
>
> One-click demo logins on the page — try it as the shop owner, a
> technician, or a customer. Questions welcome. **[[your name]] · [[phone]]**

### B — problem-first

> If "is my phone ready?" is half your day, this might help.
>
> I built a system for repair shops: customers track their own repair with
> a link (no account, no app), you build itemised bills in about a minute,
> and bank transfers get verified with one click — built around how repair
> shops here actually take payment.
>
> Try the whole thing yourself, no signup: **[[demo link]]** (one-click demo
> logins on the page — owner, technician or customer)
>
> **[[your name]] · [[phone]]**

### C — social proof (once you have shop #1 live — don't post this variant before then)

> Been running this at my own repair shop for a while now, and just started
> setting it up for other shops.
>
> [Video]
>
> Customers stop calling to ask if it's ready. You get a real record of what
> a repair actually earned. Try it yourself — no signup: **[[demo link]]**
>
> **[[your name]] · [[phone]]**

## Where to post

Sri Lankan phone-repair and mobile-technician Facebook groups — you'll know
the specific ones better than I would guess at; this doc deliberately
doesn't invent group names. A few things worth doing regardless of which
group:

- Read the group's rules first — some restrict self-promotion to specific
  days or threads
- Post the **video natively** to Facebook rather than a YouTube/external
  link where possible — native video gets more reach in groups
- Reply to every comment, especially skeptical ones — "how much" and "is my
  data safe" are the two you should have ready answers for
  ([PROPOSAL.md](PROPOSAL.md)'s "Common questions" section already has both)

## After posting

- [ ] Note which post/group actually drove clicks or replies — you'll want
      this before repeating the post elsewhere
- [ ] Every question asked in the comments that isn't already answered in
      [PROPOSAL.md](PROPOSAL.md)'s FAQ is a candidate to add there

---

<sub>Demo post kit version 1.0 · 7 August 2026</sub>
