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

Left undone in step 2 on purpose: the Today hero says "Open repair" rather than changing status in one tap; there is no "returning customer" hint under the phone field; `customerPhone` is not shown or editable on the repair page yet.

## Steps left

1. **Check steps 1 and 2 in the browser** at phone and laptop sizes and fix what is broken.
2. **Step 3, Board and repair page** as described above. Also:
   - Show and edit `customerPhone`, with Call (`tel:`) and WhatsApp (`wa.me`) links.
   - One-tap next step on the Board cards and the Today hero. Status changes notify the customer, so make them easy to undo.
   - One status wording everywhere. `src/lib/status.ts` deliberately has three label forms: `doneLabel` (for example "Repair Started"), the current activity (`currentActivityLabel`, for example "Repairing") and `pendingLabel`. Lists currently show `doneLabel` while the detail page shows the activity, so the same repair reads differently. Use the current activity everywhere, including the public tracking page and the bill. Note COMPLETED is the shop's "Ready for pickup" step and READY_FOR_PICKUP is a legacy status treated as COMPLETED.
3. **Step 4, homepage** as described above. Also fix the sideways scroll on phones (the slide-in animations and glow blobs make the page 399px wide on a 375px screen) and the WhatsApp button overlapping the footer.
4. **Step 5, the rest of the admin pages** restyled. The admin header is still the old top bar with a More menu.
5. **Step 6, Settings** as described above.

Other known problems: the seven shop products are the sample products from `prisma/seed.ts`; Settings still says "Colombo, Sri Lanka" (the owner can change it himself).

## Rules

- Work on `ui-rebuild`. Never merge into `main` or push without the owner asking.
- One commit per step.
- Show the owner a sample or screenshots before building anything new.
- Do not change live data.
- Database migrations run during the Vercel build (`vercel-build` runs `prisma migrate deploy`). If preview builds use the production database, a preview build changes the live database too. Keep migrations additive and tell the owner before pushing one.
