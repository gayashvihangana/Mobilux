# Getting started with your system

**A quick reference for [[shop name]]**

> **Before you print or send this:** every `[[…]]` marker is specific to this
> shop or to you as the installer — fill them in. Delete this box afterwards.
> Handed over in person, alongside the training session, not instead of it.

---

## Your website

- **Customers:** `[[https://yourshop.example.com]]`
- **Your team signs in separately, at:** `[[https://yourshop.example.com/staff/login]]`
  — bookmark this. It's not linked from anywhere on the public site on
  purpose, so keep the link somewhere your team can find it.

## Your logins

| Who | Signs in at | Password |
|---|---|---|
| You (owner) | `/staff/login` | Set during install — change it the first time you sign in |
| Each technician | `/staff/login` | You set it under **Staff** (see below), and read it out to them once |
| Customers | `/login` | They set their own |

**If you ever forget your own password:** there's no automatic reset for
staff accounts (a technician may not have an email you control), so if
you're locked out, contact `[[installer name/phone]]`.

---

## The five things you'll do every day

### 1. Log a repair

**Repairs → New** at the top of the list.

Fill in the device, what's wrong, and — if the customer has an account —
link it to them (search by name, email or phone). No account? Just type
their name; you can always link it to an account later if they sign up.

Once saved, the customer gets a **tracking link**. If they have an account
it shows up automatically in their dashboard. If they're a walk-in, the
link is printed on their receipt / shown on screen — that's the only way
they can check progress, so make sure they actually get it.

### 2. Move it along

Open the repair, and change its **status** as the work happens — received,
diagnosing, waiting on parts, in progress, done. Add a short note at each
step if it's useful ("waiting on a screen from the supplier") — the
customer sees your notes on their tracker, so keep them customer-appropriate.

**If something you didn't expect goes wrong on the bench** — a part breaks,
a screen cracks further — use **Report an issue** on that repair instead of
just fixing it quietly. It records what happened and lets you offer a free
fix; the customer accepts or declines. It feels like more paperwork than
just fixing it, but it's the difference between a documented process and
"he said, she said" three weeks later.

### 3. Issue the bill

Open the repair → **Bill**. Add each line item (labour, parts, anything
else), a discount if one applies, and the bank account you want them to pay
into (defaults to your main one from Settings). Print it, download it as a
PDF, or the customer sees the same bill on their own tracker.

### 4. Take the payment

- **Cash or card in person:** open the bill → **Mark paid** → pick the method.
- **Bank transfer:** the customer uploads their own receipt from their
  tracker. It shows up under **Payments** waiting for you to check it —
  open it, look at the receipt, **Verify** or **Reject**. They get an email
  either way.

### 5. Check what needs attention

**Overview** is your morning check — active repairs, what's ready for
pickup, anything waiting on you. **Reports** has revenue, repair volume and
what bench errors have actually cost you, if you want to go deeper.

---

## Settings — set these once, change them whenever

**Settings**, under your name in the top corner. Everything here shows up
on your website, your bills and your emails **immediately** — no need to
call anyone, no waiting for a redeploy.

| Field | Shows up on |
|---|---|
| Shop name, tagline | Header, browser tab, bills, emails |
| Phone, email, address, hours | Bills, footer, the "visit us" info |
| WhatsApp number | The chat button customers see everywhere. Leave blank to hide it entirely |
| Logo (image or emoji) | Header, bills — upload an image if you have one, or just pick an emoji |
| Brand colour | Every button and accent on your site |
| Bank accounts | The "pay to" box on unpaid bills. You can have more than one — the first is the default |

A bill you've already issued keeps showing the bank account it was issued
against, even if you change your default afterwards — so changing banks
never quietly rewrites an invoice a customer already has.

## Adding a technician

**Staff → New technician.** Name, email (doesn't need to be one you
control — it's just their login), phone, and you set their password. Read
it out to them; there's no way for them to see it again after this screen,
so if they lose it, come back here and reset it.

**Technicians can:** log repairs, update status, build and issue bills,
verify payments, run the storefront.
**Technicians cannot:** see your revenue or profit, change settings or bank
accounts, delete anything, block a customer, or add another technician.

**If someone leaves:** **Staff → Deactivate.** This ends their session
immediately — on their phone, right now, not the next time they'd normally
log in. Do this the day someone leaves, not "when you get around to it."

## Customers

You don't need to create customer accounts — most of your customers will be
walk-ins with just a name on the ticket. If someone wants their history,
loyalty discount and their own dashboard, they sign up themselves at
`[[https://yourshop.example.com/register]]`, or you can create one for them
from **Customers → New**.

A blocked customer, or one whose password just changed, is signed out
**immediately** — not up to eight hours later. If a customer asks to be
unblocked, you'll see the request on the **Customers** page.

---

## Who to call

| Problem | Contact |
|---|---|
| The site is down, or something's badly broken | `[[installer phone — say this is urgent]]` |
| A "how do I…" question | `[[installer phone/email]]` |
| You've forgotten your own login | `[[installer phone]]` |
| A customer complaint about something the system did wrong | `[[installer phone]]` |

Your data is backed up automatically. If something is ever deleted by
mistake, it can very likely be recovered — call rather than trying to
re-enter it by hand.

---

<sub>Handover pack version 1.0 · [[install date]] · Mobilux for [[shop name]]</sub>
