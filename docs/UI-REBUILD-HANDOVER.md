# Mobilux UI rebuild: handover

Read this before working on the UI rebuild. Updated 20 Nov 2026, after checking steps 1 and 2.

## The owner

Gayash runs Mobilux, a home-based phone repair shop in Pannipitiya, Sri Lanka, that specialises in chip-level board repair. This app is his shop software: public website, repair tracking for customers, and the admin he uses at the counter, often on his phone. Write to him in short, plain English. He wants to see a sample of anything new before it is built.

## Stack

Next.js 15 App Router, React 19, Tailwind CSS v4, shadcn-style components in `src/components/ui`, Prisma with Postgres (Neon), next-auth. Deployed on Vercel: `main` is the live site (mobiluxlk.vercel.app); other branches get preview builds. Currency is LKR.

## Design decisions (all made by the owner)

Style "A, Bright":
- Background `#F5F7FB`, cards white, text `#0B1B33`, muted text `#55637A`.
- Vivid blue `#2457F5` (`bg-primary`) for main actions; logo navy `#083262` (`bg-ink`, Button variant `ink`) for dark buttons, dark cards and navigation.
- Font Plus Jakarta Sans. Cards rounded about 24 to 28px with no border or shadow in light theme. Buttons at least 44px tall, text fields 48px.
- Light theme by default; dark stays as an option.
- Colour only carries meaning: blue for in progress, amber for waiting or unpaid, green for ready or done, red for problems.
- No gradient washes, glow blobs, glass effects or emoji. Every page must work at 375px wide with no sideways scroll.
- Logo files: `public/brand/mobilux-logo.png` (full) and `public/brand/mobilux-mark.png` (icon only).

Admin layout:
- **Today** (admin home, `/admin`): bento grid. Done in step 2.
- **Repairs page** (`/admin/tickets`): a board with one column per status (Received, Diagnosing, Waiting for parts, Repairing, Ready for pickup). Each card shows a device picture placeholder, device, problem, customer, day count, and one button that moves the repair to the next step ("Start diagnosing", "Send price", "Part arrived", "Mark ready", "Picked up"). Ready-for-pickup cards also show the amount to collect and a "Remind" button. Search box at the top for REP number, customer name, phone and device. On a phone the board becomes swipeable status tabs with the same cards.
- **Repair page** (`/admin/tickets/[id]`): a large header card in primary blue with the device picture, REP number and date, device name, problem, and buttons "Mark <next step>" (main), "Bill", and a "⋯" menu holding edit, go back a step, cancel and delete. Under it: the six steps named in words (Received, Diagnosing, Waiting for parts, Repairing, Ready for pickup, Picked up) with the current one highlighted; a Customer card with initials, name, phone, earlier repair count and Call / WhatsApp / Send link buttons; a Money card with quoted price, parts and costs, profit if paid in full, and "Add part or cost". On a phone the main action sits in a sticky bar at the bottom.
- **Settings** (`/admin/settings`): left menu of sections, open section on the right, a dark bar at the bottom showing unsaved changes with Discard and Save. Sections: Shop profile (logo, name, tagline, phone, WhatsApp, email, town, opening hours per day with on/off switches), Repairs (step names, default warranty days, ticket number prefix, common problems for quick entry), Bills and payments (bank accounts, bill text), Customer messages (WhatsApp texts for "ready for pickup" and reminders), Appearance (light or dark, accent colour), Staff and roles, Account and security, Data (export repairs and customers). Every setting must really work: Repairs, Customer messages, Data and per-day hours are new and need database fields.
- Other admin pages keep their content but use the same components and colours; tables become cards under 768px.

Public website (homepage, "A Bright"):
- Header in a white rounded bar: logo, links (Services, Track repair, Shop, Find us), a "WhatsApp us" button.
- Hero split in two: a white card with a small "Phone repair in Pannipitiya" pill, the headline "We fix the board, not just the screen.", a short line about chip-level repair, price before work and live tracking, buttons "Send a photo for a price" and "Track my repair", and hours, phone and warranty in small text; beside it a blue card with a phone image and a floating status card.
- Below: picture cards for Chip-level board repair, Screens and batteries, Water damage.
- Town, phone, WhatsApp and hours come from Settings, never hardcoded. Hide the reviews section until there are at least three real reviews.
- Use free-licence stock photos (Unsplash, Pexels) as placeholders: no faces, no other shop's name or signs. List every image in one file so the owner can swap in his own photos later.

## Design samples and links

- **`docs/design-samples/`**: static HTML copies of every approved sample, with a README saying which file is which. Open them in a browser, or read the markup for exact colours, sizes and spacing. These are the reference for the look; this file is the reference for the decisions.
- Design canvas with all samples, including rejected options: https://claude.ai/artifact/H31eGLbDWzkc74jjinyk7r (pages "Admin layouts (style A)" and "Style options").
- **`docs/UX-AUDIT.md`**: the full UX audit, 62 findings with IDs (S1, P2, A6…), evidence and fixes. Online version: https://claude.ai/artifact/H9RtRNDfEWDWPjVyARsMg2
- GitHub: https://github.com/gayashvihangana/Mobilux (work branch `ui-rebuild`).
- Live site: https://mobiluxlk.vercel.app (built from `main`).

The two claude.ai links are private to the owner and need his sign-in, so Claude Code cannot open them. If something there is needed, ask the owner for a screenshot or for the text.

## Done so far (branch `ui-rebuild`, pushed to GitHub)

- `a21cf7f` Step 1, shared look: `src/app/globals.css` (light tokens, `--ink`), `src/app/layout.tsx` (Plus Jakarta Sans), `src/components/theme-provider.tsx` (light default), `src/components/ui/{button,card,input,textarea,select,badge}.tsx`, `src/components/logo.tsx`, `public/brand/`.
- `b9aa278` Step 2:
  - `src/app/admin/page.tsx` is the new Today screen. The old overview moved unchanged to `src/app/admin/overview/page.tsx`, called "Shop numbers" and linked under More.
  - `src/app/admin/tickets/new/quick-repair-form.tsx`: name, phone, brand, model, problem, optional quote; always saved as RECEIVED. Used on `/admin/tickets/new` and, compact, on the Today screen. `/admin/tickets/new?mode=past` shows the old long form for finished repairs.
  - New column `RepairTicket.customerPhone` (migration `prisma/migrations/20261117090000_ticket_customer_phone`). `adminCreateTicket` saves it, and `src/lib/track.ts` checks the tracker's "last 4 digits" against it first, then the linked account's phone.
  - Today's month figures use the same rule as Reports: money counts in the month of `completedAt ?? createdAt`.
- `1a334f2` The owner's own small fixes (header overflow, logo truncation, demo data).

Checked in the browser on 20 Nov 2026 (local database, 375px and 1366px): Today, New repair, Add a past repair and Track all load with no sideways scroll. The `customerPhone` migration has been run on the local database only. Fixed while checking:
- `next.config.ts`: the security policy blocked `eval`, which the dev server needs, so in `next dev` no page code ran at all (empty dropdowns, dead buttons). `'unsafe-eval'` is now allowed in development only.
- `src/lib/actions/tickets.ts`: the quick form leaves out fields of the long form, which arrive as `null` and failed validation, so every quick save failed silently. Optional fields now accept `null`.
- `quick-repair-form.tsx`: keeps what was typed after a failed save (FormAutosave) and shows a message if the save is rejected for a field the form does not show.

Local testing: sign in at `/staff/login` as the demo owner (`src/lib/demo-accounts.ts`); the local database holds demo data.

Left undone in step 2 on purpose: there is no "returning customer" hint under the phone field.

Step 3, Board and repair page (done):
- **Status meaning changed (owner's decision, option A).** A status is now what is happening *now*: DIAGNOSING means being diagnosed, AWAITING_PARTS means waiting for a part. Before, it meant the last step *finished*. `src/lib/status.ts` has one name per status (`statusLabel`); `doneLabel`, `currentActivityLabel` and `pendingLabel` are gone. Repairs that were open on the live site when this ships will each read one step earlier; the owner should check them. Finished repairs are not affected.
- `src/app/admin/tickets/page.tsx` is the Board (columns on laptop, swipeable tabs on phone in `board-columns.tsx`), with search (REP, name, phone digits, device), and Finished and Unpaid lists, 20 per page. Old `?status=` links still work.
- `src/components/admin/next-step-button.tsx`: the one-tap button (Board, Today, repair page) with an Undo message. "Send price" asks for the price and "needs a part" or "no part". Server side: `moveTicket` and `undoTicketMove` in `src/lib/actions/tickets.ts`; Undo uses the existing rewind, which sends the customer nothing.
- `src/app/admin/tickets/[id]/page.tsx` is the new repair page; the "⋯" menu is in `repair-actions.tsx`. The customer's name and phone are edited there (`updateTicketContact`); Call and WhatsApp links come from `src/lib/phone.ts` (07X numbers become 947X for WhatsApp).
- New colour tokens `warning-soft`, `warning-tint` and `amber` for the sample's soft amber; `--warning` stays the darker orange for text.

Step 4, homepage (done):
- `src/app/(marketing)/page.tsx`: hero (white card plus blue card with a tracking card), three service cards, and "Find us" with Call, WhatsApp and Directions. Town, phone, WhatsApp, address and hours all come from Settings; the town is the last part of the address. "30-day warranty" is fixed text until warranty days is a setting (step 6).
- Photos: none added yet. Every image slot is in `src/lib/site-images.ts`; while a slot is empty the page shows a drawing like the sample. The owner can drop photos into `public/photos/` and set the paths.
- Removed from the homepage: the parallax cover, glow blobs, slide-in animations, "How it works", the sample products and the "Get started free" sign-up push. Page went from 6,648px to about 3,360px tall on a phone, and from 399px to 375px wide.
- Header: solid white bar, links Services, Track repair, Shop, Find us, and "WhatsApp us" in place of "Sign up". The footer has room underneath so the WhatsApp button no longer covers its links.
- Reviews show only with at least 3 approved, as a plain grid (no moving rails).

Step 5, admin menu and the other admin pages (done):
- Admin menu as in the approved `docs/design-samples/admin-nav.html`: `src/components/admin-shell.tsx` (navy sidebar from 1024px, bottom bar with Today, Repairs, +, Payments, More below that) wired up in `src/app/admin/layout.tsx`. The sidebar shows counts for open repairs and payments to check. The old `admin-nav.tsx` is gone.
- Tables: `src/components/ui/table.tsx` copies each column title onto its cells, and `globals.css` stacks every row under 768px, so all ten admin tables fit a phone with no page changes. Pass `stack={false}` to keep a table as a grid.
- Buttons: size `sm` and `icon-sm` are now 44px.
- Every admin page measured at 375px and 1366px: no sideways scroll (Reports was 441px wide because of its hidden screen-reader table).
- Not done: the pages' own content is unchanged, so "Shop numbers" still has its glow blobs and many small cards, and the stat cards on Customers stack one per row on a phone. Worth a pass later.

Step 6, Settings (done):
- `src/app/admin/settings/page.tsx`: section menu (`?section=`), with `settings-form.tsx` (tracks unsaved changes, dark Discard/Save bar) and `sections.tsx` (the fields). No migration: settings are rows in the existing `Setting` key–value table.
- `saveSettings` in `src/lib/actions/settings.ts` writes only the fields a section sends; the old all-fields `updateShopInfo` and `ShopInfoForm` are gone.
- New settings, each wired to where it is used: opening hours per day (also saved as the one-line `hours` text every bill and message reads, and drives "Open now / Closed now" on the homepage); warranty days (homepage and bill warranty terms); repair number prefix (`src/lib/next-ticket-number.ts`; a new prefix starts again at 001); common problems (new-repair chips); bill thank-you line; WhatsApp texts for Remind and Send link (`{name}`, `{device}`, `{ticket}`, `{amount}`, `{link}`, `{shop}`).
- Data: `/admin/export/repairs` and `/admin/export/customers` download CSV (admin only; walk-ins grouped by phone number).
- Plain helpers that the browser also needs are in `src/lib/settings-shared.ts`.
- Not built: renaming the repair steps. Step names are tied to the status meanings and the tracker, so changing them needs its own design.

Step 7, bills and payments (done):
- Approved sample: `docs/design-samples/bill.html`.
- Bill page `/admin/tickets/[id]/bill` (`bill-builder.tsx`): items with quantity and price, quick-add chips, discount, a Payments list, a closed "More options" (problem, work done, technician, warranty, pay-to account, bill date, what prints), and on the right the totals and a live preview of the printed bill. Status track Draft → Saved → Part paid → Paid; one main button (Save bill / Record payment / Download receipt); phone has Edit and Preview tabs and a bottom bar with the balance. Staff with `bill:write` can use it, not only admins.
- Part payments: migration `20261121090000_bill_payments` adds `RepairTicket.billPayments` (JSON list of `{ id, amount, method, at, by }`). `paidAmount` is kept as their sum, so the reports and Board read it unchanged; `paidAt` is set only when nothing is left to pay. Actions `recordBillPayment` and `removeBillPayment` replace `markBillPaid` / `markBillUnpaid`. An old hand-entered "Customer paid" shows as one payment; once payments are recorded, the edit form no longer overwrites the paid amount.
- `computeBill` in `src/lib/bill.ts` now returns `payments`, `paidTotal`, `balance` and `state`. Line items keep `amount` as the line total, so old bills read the same.
- Customer bill link `/invoice/[trackToken]` (no sign-in, not indexed): balance due or a green "Paid" receipt, items, bank details with Copy buttons and the bill number as reference, "Send your slip on WhatsApp" (or "Upload payment slip" for the signed-in owner), and print to PDF. The tracker links to it once the repair has a price. Slip uploads now ask for the balance, not the full price.
- Printed bill (`src/components/bill-document.tsx`) redesigned like the sample: Item / Qty / Price / Total, every payment, a black "Balance due" box, PAID stamp. It sizes by its own width, so the narrow preview stacks neatly.

Step 8, Brand and Model boxes (done):
- `src/components/forms/device-fields.tsx`: Brand and Model suggest as you type (Apple, Asus, Acer for "A"; every iPhone 13 for "13"), with arrow keys, Enter and Escape. Anything else can be typed ("Add ..."), and "Other brand/model" clears the box to type in. With no brand, picking a model fills in its brand; a new brand clears the model.
- Used on the quick new-repair form, the full repair log, the edit form and the customer's own booking form.
- The list is `src/lib/devices.ts` (popular phones, tablets and laptops sold in Sri Lanka). Brands and models the shop has saved on repairs are added to it (`deviceSuggestions` in `src/lib/actions/devices.ts`), so a model typed once is offered next time. No database change.

## Steps left

All eight steps are done. Ideas for later: restyle the insides of the back-office pages (Shop numbers, Customers stat cards), real photos on the homepage, and "returning customer" under the phone field.

Other known problems: the seven shop products are the sample products from `prisma/seed.ts`; Settings still says "Colombo, Sri Lanka" (the owner can change it himself).

## Rules

- Work on `ui-rebuild`. Never merge into `main` or push without the owner asking.
- One commit per step.
- Show the owner a sample or screenshots before building anything new.
- Do not change live data.
- Database migrations run during the Vercel build (`vercel-build` runs `prisma migrate deploy`). If preview builds use the production database, a preview build changes the live database too. Keep migrations additive and tell the owner before pushing one.
