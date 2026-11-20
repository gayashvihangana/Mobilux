# Mobilux UX Audit

16 Nov 2026 · Gayash Vihangana

Copy of the audit made before the UI rebuild. Finding IDs (S1, P2, A6…) are referred to in `UI-REBUILD-HANDOVER.md`. Some items are already fixed by steps 1 and 2: A1, A2, P1 (walk-in phone and the Received default) and A10 (Today uses the Reports month rule).

## Summary

Mobilux works, but this audit lists 62 design and usability findings, and two of the problems break real tasks for a walk-in repair shop. The code underneath is sound, so this needs a UI rebuild on the same backend, not a rewrite.

| Severity | Count | What it means |
| --- | --- | --- |
| Critical | 3 | A normal task fails or records wrong data (P1, A1, A2; P1 and A2 are one problem) |
| Major | 30 | Slows you at the counter, breaks on phones, or costs customer trust |
| Minor | 29 | Looks unpolished or inconsistent |

The two critical problems:

1. **Walk-in customers cannot use the public tracker.** It needs the last 4 digits of a phone number, and the intake form has no phone field. The printed bill still tells them to use it.
2. **New repairs start as "Picked Up".** A real walk-in logged in a hurry is recorded as already finished.

Three patterns cause most of the rest:

- **Built desktop-first.** Tables do not fit on phones on 9 admin pages, and the Repairs table does not fit on a 1366px laptop either.
- **Template styling instead of shop identity.** Glow, glass, gradients and motion everywhere, but no real photos, a generic icon for a logo, and "Colombo" instead of Pannipitiya.
- **No single source for words and numbers.** The same status has two names, and the Overview and Reports pages give different figures for the same month.

**How this was checked.** Every admin page, the shop, product, tracker and bill pages were measured live at 375px (phone) and 1366px (laptop), signed in as the owner. The homepage was measured signed out at 375px and 1440px. The customer area and the customer sign-in pages were read from the code only, because the site sends a signed-in staff account back to the admin pages. Nothing on the site was changed.

## Site-wide problems

These eleven problems repeat across pages, so fixing each one once in the shared components fixes it everywhere.

| # | Problem | Evidence | Severity | Fix |
| --- | --- | --- | --- | --- |
| S1 | Tables do not fit on phones | 9 admin tables are wider than the screen: Customers 714px, Orders 746px, Products 705px, Activity 728px, Staff 552px, Loyalty 461px, Bench errors 1,142px, Overview recent repairs 767px, all inside a 342px area | Major | Show rows as cards under 768px; keep tables for laptop |
| S2 | Buttons are too small to tap | Main actions are 32px tall (Create bill, View bill, Delete record, Copy link); tabs 29px; edit and delete icons 32x32 side by side; text links 14 to 20px tall | Major | 44px minimum for anything tapped on a phone |
| S3 | One status, two names | List and Overview say "Repair Started"; the detail page and the public tracker say "Repairing" for the same repair | Major | One label per status, used everywhere |
| S4 | Template look | Glow blobs, grid lines, glass cards, gradient text, pill badges, pulsing and fade-in motion, a blue caps label above every heading | Major | Flat surfaces, one accent colour, motion only for feedback |
| S5 | Brand is not yours | Generic phone icon as logo, no logo uploaded in Settings, address set to "Colombo, Sri Lanka" | Major | Upload the wrench-in-phone logo, set Pannipitiya, use the navy and light blue-white palette |
| S6 | Text too small | 9px notification count, 10px step numbers and chart labels, 11px captions on the Overview and the bill | Minor | 12px floor, 14px for anything read at the counter |
| S7 | No type scale | The Overview alone uses 11 text sizes (9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36px) | Minor | 5 or 6 sizes in a fixed scale |
| S8 | Colour without meaning | Overview numbers are green, orange and blue for no reason; green is also the profit colour | Minor | Neutral numbers; green, amber and red only for good, waiting and problem |
| S9 | Slightly low contrast on small labels | Status pills and avatar initials measure 3.5 to 4.4 against the 4.5 target, in both themes; 28 cells on the Repairs list in light theme | Minor | Darken pill text one step |
| S10 | No custom 404, error or loading pages | The code has no not-found, error or loading files, and the Skeleton component is never used | Minor | Branded 404 and error pages; skeletons on slow lists |
| S11 | No show-password button | Sign-in and register forms have plain password fields only | Minor | Add an eye toggle |

## Public site

The public site looks like a software product page, not a neighbourhood repair shop, and the tracker fails for most of the customers.

| # | Page | Problem | Evidence | Severity | Fix |
| --- | --- | --- | --- | --- | --- |
| P1 | Track | Tracker cannot find walk-in repairs | It matches the last 4 digits of the customer's phone; walk-in tickets store no phone, so the lookup always fails | Critical | Add a phone field at intake (see A2) |
| P2 | Home | Page scrolls sideways on phones | 399px wide on a 375px screen; caused by the slide-in animation and glow blobs | Major | Clip horizontal overflow; remove the slide-in |
| P3 | Home | WhatsApp button partly off-screen | Its right edge sits at 383px on a 375px screen, and it covers the footer links | Major | Fix P2; keep clear space under the footer |
| P4 | Home | Wrong town | "Live repair tracking · Colombo" is typed into the page code | Major | Read the town from Settings |
| P5 | Home | No phone, address, hours or map | None of them appear on the homepage, though Settings holds them | Major | Put call, WhatsApp, directions and hours in the first screen |
| P6 | Home | No real photos | Every image is a drawn icon or a mock phone | Major | Photos of the bench, a board repair, the shopfront, the owner |
| P7 | Home | The specialty is missing | Services lists six generic items and "tablets, laptops and smartwatches"; chip-level repair is not named | Major | Lead with chip-level and board repair |
| P8 | Home | The only review is the owner's | "5.0 average from 1 review", written under the owner's own name | Major | Hide the section until 3 real reviews exist |
| P9 | Shop | Product names cut off | All 7 names are cut to one line on a phone ("Wireless Earb…") | Major | Allow two lines |
| P10 | Tracking result | Walk-ins are told to sign in | "Sign in for full details" is shown to people who have no account | Major | Show the bill and notes on the link itself |
| P11 | Home | Too long | 6,218px on a phone, about 7.7 screens; "How it works" alone is 1,196px for four short steps | Minor | Cut to about 4 screens |
| P12 | Home | Hero taller than the screen | 1,126px on an 812px phone, with an empty dark band under it | Minor | Size the hero to its content |
| P13 | Home | Overlapping pieces in the hero | The "Ready for pickup" bubble covers the "In progress" badge; circuit dots sit on the text and a button | Minor | Remove the mock phone and circuit lines |
| P14 | Home | Typo in the review | "USB Ports Losen" | Minor | "Loose" |
| P15 | Shop | Placeholder product art | Icons with a MOBILUX watermark instead of photos | Minor | Real photos, or hide the shop until there is stock to show |
| P16 | Track | Placeholders look like filled fields | "REP-044" and "5678" in the same style as typed text | Minor | "e.g. REP-044" in lighter text |
| P17 | Tracking result | Progress steps lose their names on a phone | Only "5" and "6" at 10px | Minor | Show the current step name in words |

## Sign-in and account pages

The sign-up path asks for an account before a customer can ask for anything. These pages were read from the code; only the staff sign-in page was seen live.

| # | Problem | Evidence | Severity | Fix |
| --- | --- | --- | --- | --- |
| L1 | "Start a repair" leads to a sign-up form | The main homepage button links to the register page | Major | Let people send the request first (name, phone, device, problem); offer an account afterwards |
| L2 | Phone number is optional at sign-up | The register form marks it "(optional)", but the tracker and the shop both depend on it | Major | Make phone required and email optional; a repair shop calls and WhatsApps |
| L3 | Two separate sign-in pages | Customers and staff each have their own page and can land on the wrong one | Minor | One sign-in page that routes by role |

## Customer area

This area was read from the code only and not seen on a screen, so treat these as likely problems to confirm, not measurements.

| # | Problem | Evidence | Severity | Fix |
| --- | --- | --- | --- | --- |
| C1 | The repair request form asks too much | Brand, model, a short title and a full description are all required; the homepage calls it a two-minute form | Minor | Require device and one problem field; make the rest optional |
| C2 | Five menu items for an account most people open twice | Dashboard, My repairs, My orders, Shop, Feedback | Minor | One "My repairs" page with orders and feedback inside it |

Most customers are walk-ins without accounts, so this area matters less than the tracking link they get by WhatsApp or QR code. The rebuild should treat that link page as the main customer screen.

## Admin: daily screens

The screens used for every repair are the slowest ones: the form defaults are wrong for a walk-in, the list cannot be searched, and the main action is three screens down on a phone.

| # | Page | Problem | Evidence | Severity | Fix |
| --- | --- | --- | --- | --- | --- |
| A1 | New repair | Starts as "Picked Up" | The status field defaults to Picked Up; the form was built for logging old repairs | Critical | Default to Received; move old-repair logging to a separate "Add past repair" option |
| A2 | New repair | No customer phone field | 18 fields, none of them a phone number for a walk-in | Critical (cause of P1) | Name and phone first |
| A3 | Repairs | No search | Filter and Sort only, across 50 repairs | Major | Search by REP number, name, phone and device |
| A4 | Repairs | Table cut off on a laptop | 1,283px table in a 1,118px area at 1366px and 1440px; Date and Bill columns are hidden | Major | Drop the Profit column from the list; merge Date into the row |
| A5 | Repairs | Only two columns visible on a phone | Ticket and Customer show; device, issue and status need a sideways scroll | Major | Cards: device, problem, status, customer |
| A6 | Repair details | Main action buried | "Mark as Completed" sits 2,531px down a 3,784px page on a phone | Major | Sticky bar with the next step |
| A7 | Repair details | Delete beside Create bill | "Delete record" is a red button in the same row as the two bill buttons | Major | Move it into a "more" menu |
| A8 | Repair details | Header buttons cut off on a phone | The status badge and "Delete record" run past the right edge | Major | Stack the header |
| A9 | Repair details | Too many actions in view | 15 different buttons, with undo, skip and cancel directly under the main action | Major | One primary action; the rest in a menu |
| A10 | Overview and Reports | The numbers disagree | Overview: revenue this month LKR 0, costs LKR 1,000. Reports for November: revenue LKR 5,700, costs LKR 5,480, profit LKR 220 | Major | One calculation shared by both pages |
| A11 | Overview | All-time and this-month figures mixed | "LKR 126,500" (all time) with "LKR 0 this month" under it; "LKR 6,120 (120%) vs last month" | Major | A period switch: today, this month, all time |
| A12 | Overview | Step count does not match | Card says "Step 6 of 8"; the detail page shows 6 steps | Minor | One step list |
| A13 | Overview | Same number shown twice | Revenue, Costs and Customers each appear in two cards | Minor | Show each once |
| A14 | Overview | Pipeline counts finished repairs | 46 picked up against 1 active, under the caption "every open repair" | Minor | Open repairs only |
| A15 | Overview | "Customers 6" is misleading | It counts accounts; most of the 50 repairs were walk-ins | Minor | Count people served |
| A16 | Overview | Too long and too boxed | 5.3 screens on a phone; 23 bordered cards on a laptop | Minor | Today first: on the bench, ready for pickup, unpaid |
| A17 | Overview | Money shown with cents | "LKR 4,517.86" | Minor | Round to rupees |
| A18 | Repairs | All rows on one page | 50 rows, 4.7 screens on a laptop, no paging | Minor | 20 per page, active first |
| A19 | New repair | No page title; private fields mixed in | No main heading; "Forgotten parts" and "Notes & lessons" sit in the intake form | Minor | Intake first, bookkeeping after |
| A20 | Bill builder | Very long, and slightly too wide | 5.5 screens and 16 fields on a phone; 388px on a 375px screen; drag handles 24px | Minor | Prefill from the ticket; show only the line items and total |
| A21 | Bill | Tells walk-ins to use the tracker | "enter ticket REP-050 on our online tracker" cannot work without a phone on file | Major | Fixed by A2; until then print the QR only |
| A22 | Bill | Says the free fix is "completed" early | The invoice for REP-050 says so while the repair is still at Repair Started | Minor | Word it by the current status |
| A23 | Bill | Wrong address | Prints "Colombo, Sri Lanka" from Settings | Major | Set the address in Settings |

## Admin: back office

The back-office pages mostly share the site-wide problems (S1, S2); six more are specific to them.

| # | Page | Problem | Evidence | Severity | Fix |
| --- | --- | --- | --- | --- | --- |
| B1 | Customers | Walk-in customers are not in the list | The page lists 6 accounts; 5 of them have never signed in, and people served as walk-ins do not appear at all | Major | A customer is a name and a phone number, with or without an account |
| B2 | Reports | Whole page scrolls sideways on a phone | 471px wide on a 375px screen, from the monthly table | Major | Card rows or a scroll area inside the table only |
| B3 | Shop, Products | The products look like sample data | All 7 products have the same names as the project's sample-data file, including two pre-owned phones | Major, if they are not real stock | Replace with real stock, or hide the shop |
| B4 | Navigation | 10 of 14 sections hidden under "More" | Only Overview, Repairs, Customers and Payments are visible | Minor | A sidebar on laptop; a bottom bar with 4 items on phone |
| B5 | Bench errors | Table too wide even on a laptop | 1,142px table in a 1,118px area; 379px page on a 375px phone | Minor | Shorten the two text columns |
| B6 | Products | Names cut off in the admin list too | 3 of 7 names are shortened | Minor | Two lines |

Payments, Orders, Loyalty, Reviews, Notes, Staff, Activity, Settings and Profile showed no problems beyond S1 and S2.

## Rebuild goals

1. **Phone first for the counter.** Every admin page works at 375px with 44px targets and no sideways scroll (S1, S2, A5, A8, B2).
2. **Three taps to log a walk-in.** Name, phone, device, problem, save (A1, A2, A19).
3. **Find any repair in one step.** Search on the Repairs page and from the header (A3).
4. **One next action per repair.** A sticky bar with the next step; delete, undo and cancel in a menu (A6, A7, A9).
5. **One set of words and numbers.** A single status list and a single money calculation used by every page (S3, A10, A11, A12).
6. **A home screen that answers "what do I do today".** On the bench, ready for pickup, unpaid; money below (A13 to A17).
7. **A public site that looks like the shop.** Real photos, chip-level repair first, call, WhatsApp, directions and hours in the first screen, about 4 screens long (P2 to P8, P11 to P13).
8. **The tracking link as the customer's main screen.** Status in words, the bill, and a WhatsApp button, with no sign-in (P10, P17, L1).
9. **A calm visual system.** Navy and light blue-white, one type scale, flat surfaces, colour only for meaning, motion only for feedback (S4, S6 to S9).

The database, sign-in, permissions, bills and tracking logic stay as they are; the rebuild replaces the screens on top of them.
