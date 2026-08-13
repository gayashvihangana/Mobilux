import bcrypt from "bcryptjs";
import type { PrismaClient, DeviceType, TicketStatus } from "@prisma/client";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

// Everything the demo instance's database holds. Two entry points call this:
// prisma/seed-demo.ts (the one-time/manual run, invoked via bare `tsx`
// outside Next) and the nightly reset route
// (src/app/api/cron/reset-demo/route.ts) — both already guard that they're
// only ever pointed at the demo database before either function runs.
//
// Deliberately NOT `import "server-only"` — unlike lib/audit.ts and
// lib/auth-guard.ts, this module has to resolve outside Next's build too
// (prisma/seed-demo.ts runs via plain `tsx`, where the "server-only" package
// doesn't resolve). Nothing client-side imports this file — only the reset
// route and the CLI script do — so there's no real risk; the client-facing
// demo data (lib/demo-accounts.ts) is deliberately a separate, Prisma-free
// module for exactly that reason.

// Every model in prisma/schema.prisma. TRUNCATE ... CASCADE lets Postgres
// resolve the FK order itself rather than 15 hand-sequenced deleteMany()
// calls having to get that order right.
const ALL_TABLES = [
  "AuditLog",
  "Notification",
  "Testimonial",
  "OrderItem",
  "Order",
  "Payment",
  "RepairIssue",
  "StatusUpdate",
  "RepairTicket",
  "Product",
  "DiscountRule",
  "PasswordReset",
  "RateLimit",
  "Setting",
  "User",
];

export async function truncateAll(prisma: PrismaClient) {
  const tables = ALL_TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  );
}

const daysAgo = (n: number, hours = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hours, 0, 0, 0);
  return d;
};

// Same live pipeline as lib/status.ts's STATUS_PIPELINE — READY_FOR_PICKUP is
// legacy (COMPLETED now means ready for pickup) so it's handled as an extra
// step appended after COMPLETED, matching how prisma/seed.ts's own example
// ticket does it.
const PIPELINE: TicketStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "PICKED_UP",
];

type SeedTicket = {
  brand: string;
  model: string;
  deviceType: DeviceType;
  issueTitle: string;
  issueDescription: string;
  status: TicketStatus;
  createdDaysAgo: number;
  estimatedCost: number;
  finalCost?: number;
  /** Set on tickets whose bill has been paid — a handful across the set. */
  paid?: { method: "Cash" | "Bank transfer" | "Card"; daysAgo: number };
  /** Index into DEMO_CUSTOMERS, or "walkin" for no linked account. */
  customer: number | "walkin";
  walkinName?: string;
};

const DEMO_CUSTOMERS = [
  { name: "Ishara Jayasuriya", email: DEMO_ACCOUNTS.customer.email, phone: "0771000001" }, // the one-click login account
  { name: "Dilshan Wickramasinghe", email: "dilshan.w@example.com", phone: "0771000002" },
  { name: "Sanduni Rathnayake", email: "sanduni.r@example.com", phone: "0771000003" },
  { name: "Kavindu Bandara", email: "kavindu.b@example.com", phone: "0771000004" },
  { name: "Tharushi Gunawardena", email: "tharushi.g@example.com", phone: "0771000005" },
  { name: "Chamara Dissanayake", email: "chamara.d@example.com", phone: "0771000006" },
  { name: "Nethmi Senanayake", email: "nethmi.s@example.com", phone: "0771000007" },
  { name: "Ruwan Karunaratne", email: "ruwan.k@example.com", phone: "0771000008" },
];

const TICKETS: SeedTicket[] = [
  // SUBMITTED (1) — just came in online, nobody's looked yet
  { brand: "Apple", model: "iPhone 15", deviceType: "PHONE", issueTitle: "Screen flickers randomly", issueDescription: "Display flickers a few times a day, worse in low light. No drops.", status: "SUBMITTED", createdDaysAgo: 0, estimatedCost: 0, customer: 1 },

  // CONFIRMED (1) — accepted, waiting for the device to arrive
  { brand: "Samsung", model: "Galaxy S24", deviceType: "PHONE", issueTitle: "Back glass cracked", issueDescription: "Dropped from a car seat, back glass spider-cracked near the camera.", status: "CONFIRMED", createdDaysAgo: 1, estimatedCost: 32000, customer: 2 },

  // RECEIVED (3) — device is at the shop, work hasn't started
  { brand: "Apple", model: "iPhone 13", deviceType: "PHONE", issueTitle: "Won't hold a charge", issueDescription: "Battery drops from 100% to 20% within two hours of light use.", status: "RECEIVED", createdDaysAgo: 1, estimatedCost: 18000, customer: 3 },
  { brand: "Xiaomi", model: "Redmi Note 13", deviceType: "PHONE", issueTitle: "Camera app crashes", issueDescription: "Camera closes itself every time it opens, front and back.", status: "RECEIVED", createdDaysAgo: 2, estimatedCost: 12000, customer: "walkin", walkinName: "Amila Perera" },
  { brand: "Apple", model: "iPad 9th gen", deviceType: "TABLET", issueTitle: "Home button unresponsive", issueDescription: "Home button doesn't register presses about half the time.", status: "RECEIVED", createdDaysAgo: 1, estimatedCost: 9000, customer: 4 },

  // DIAGNOSING (3)
  { brand: "Samsung", model: "Galaxy A54", deviceType: "PHONE", issueTitle: "No sound from earpiece", issueDescription: "Can't hear calls through the earpiece, speakerphone works fine.", status: "DIAGNOSING", createdDaysAgo: 3, estimatedCost: 8500, customer: 5 },
  { brand: "Apple", model: "MacBook Air M1", deviceType: "LAPTOP", issueTitle: "Trackpad clicks don't register", issueDescription: "Physical click stopped working on the bottom-left corner of the trackpad.", status: "DIAGNOSING", createdDaysAgo: 2, estimatedCost: 22000, customer: 6 },
  { brand: "Huawei", model: "Nova 11", deviceType: "PHONE", issueTitle: "Phone restarts randomly", issueDescription: "Restarts itself 3-4 times a day, no pattern noticed.", status: "DIAGNOSING", createdDaysAgo: 3, estimatedCost: 15000, customer: "walkin", walkinName: "Sachini Fernando" },

  // AWAITING_PARTS (3)
  { brand: "Apple", model: "iPhone 12 Pro", deviceType: "PHONE", issueTitle: "Rear camera glass shattered", issueDescription: "Camera lens glass cracked, photos have a dark smudge in one corner.", status: "AWAITING_PARTS", createdDaysAgo: 4, estimatedCost: 14500, customer: 7 },
  { brand: "Samsung", model: "Galaxy Watch 5", deviceType: "SMARTWATCH", issueTitle: "Screen won't turn on", issueDescription: "Watch vibrates on notification but the display stays black.", status: "AWAITING_PARTS", createdDaysAgo: 5, estimatedCost: 19000, customer: 1 },
  { brand: "Dell", model: "Inspiron 15", deviceType: "LAPTOP", issueTitle: "Keyboard keys not registering", issueDescription: "The 'A', 'S' and space bar don't register presses reliably.", status: "AWAITING_PARTS", createdDaysAgo: 6, estimatedCost: 11000, customer: 2 },

  // IN_PROGRESS (3) — one of these carries the open dispute
  { brand: "Apple", model: "iPhone 14 Pro", deviceType: "PHONE", issueTitle: "Cracked screen after drop", issueDescription: "Dropped on tile, screen shattered top-right corner. Touch still works.", status: "IN_PROGRESS", createdDaysAgo: 3, estimatedCost: 68000, customer: 3 },
  { brand: "Samsung", model: "Galaxy S23 Ultra", deviceType: "PHONE", issueTitle: "S Pen not detected", issueDescription: "Phone doesn't recognise the S Pen is docked or removed.", status: "IN_PROGRESS", createdDaysAgo: 4, estimatedCost: 26000, customer: 4 },
  { brand: "Apple", model: "iPhone 11", deviceType: "PHONE", issueTitle: "Battery replacement", issueDescription: "Battery health at 68%, customer wants it replaced before a trip.", status: "IN_PROGRESS", createdDaysAgo: 5, estimatedCost: 13500, customer: "walkin", walkinName: "Roshan Wijesekara" },

  // COMPLETED (3) — ready, some paid already
  { brand: "Xiaomi", model: "Poco X6", deviceType: "PHONE", issueTitle: "Charging port loose", issueDescription: "Cable needs to be angled to charge. Port feels loose.", status: "COMPLETED", createdDaysAgo: 6, estimatedCost: 9500, finalCost: 9500, paid: { method: "Cash", daysAgo: 1 }, customer: 5 },
  { brand: "Apple", model: "iPhone 13 Pro Max", deviceType: "PHONE", issueTitle: "Face ID stopped working", issueDescription: "Face ID fails every time, falls back to passcode.", status: "COMPLETED", createdDaysAgo: 7, estimatedCost: 42000, finalCost: 42000, customer: 6 },
  { brand: "Samsung", model: "Galaxy A34", deviceType: "PHONE", issueTitle: "Water damage — won't power on", issueDescription: "Fell in a sink, doesn't turn on. Dried with rice for a day first.", status: "COMPLETED", createdDaysAgo: 9, estimatedCost: 16000, finalCost: 19500, paid: { method: "Bank transfer", daysAgo: 2 }, customer: 7 },

  // READY_FOR_PICKUP (3) — legacy status value, still exercised
  { brand: "Apple", model: "iPhone 12", deviceType: "PHONE", issueTitle: "Charging port loose", issueDescription: "Cable has to be held at an angle to charge.", status: "READY_FOR_PICKUP", createdDaysAgo: 10, estimatedCost: 15000, finalCost: 15000, paid: { method: "Cash", daysAgo: 3 }, customer: 1 },
  { brand: "OnePlus", model: "Nord 3", deviceType: "PHONE", issueTitle: "Speaker crackling at high volume", issueDescription: "Bottom speaker distorts above half volume.", status: "READY_FOR_PICKUP", createdDaysAgo: 12, estimatedCost: 9500, finalCost: 9500, customer: 2 },
  { brand: "Apple", model: "iPad Air", deviceType: "TABLET", issueTitle: "Screen digitiser not responding", issueDescription: "Top third of the screen doesn't register touch at all.", status: "READY_FOR_PICKUP", createdDaysAgo: 8, estimatedCost: 24000, finalCost: 24000, paid: { method: "Bank transfer", daysAgo: 1 }, customer: "walkin", walkinName: "Nadeesha Ranasinghe" },

  // PICKED_UP (4) — finished, collected, aging the demo out nicely
  { brand: "Xiaomi", model: "Redmi Note 12", deviceType: "PHONE", issueTitle: "Phone fell in water — won't turn on", issueDescription: "Fell into a bucket of water for a few seconds.", status: "PICKED_UP", createdDaysAgo: 20, estimatedCost: 18000, finalCost: 21500, paid: { method: "Cash", daysAgo: 15 }, customer: 3 },
  { brand: "Samsung", model: "Galaxy S22", deviceType: "PHONE", issueTitle: "Screen replacement", issueDescription: "Shattered screen after a fall, touch stopped responding entirely.", status: "PICKED_UP", createdDaysAgo: 25, estimatedCost: 38000, finalCost: 38000, paid: { method: "Card", daysAgo: 20 }, customer: 4 },
  { brand: "Apple", model: "iPhone XR", deviceType: "PHONE", issueTitle: "Battery replacement", issueDescription: "Battery health at 74%, phone shutting down at 20%.", status: "PICKED_UP", createdDaysAgo: 30, estimatedCost: 12500, finalCost: 12500, paid: { method: "Cash", daysAgo: 27 }, customer: 5 },
  { brand: "Huawei", model: "P30 Lite", deviceType: "PHONE", issueTitle: "Rear camera not focusing", issueDescription: "Photos come out blurry, autofocus doesn't lock.", status: "PICKED_UP", createdDaysAgo: 35, estimatedCost: 10000, finalCost: 10000, paid: { method: "Bank transfer", daysAgo: 32 }, customer: 6 },

  // CANCELLED (1)
  { brand: "Samsung", model: "Galaxy A14", deviceType: "PHONE", issueTitle: "Won't turn on at all", issueDescription: "No response to charging or holding the power button.", status: "CANCELLED", createdDaysAgo: 14, estimatedCost: 8000, customer: 7 },
];

function historyFor(t: SeedTicket): { status: TicketStatus; note?: string; daysAgo: number }[] {
  if (t.status === "CANCELLED") {
    return [
      { status: "RECEIVED", daysAgo: t.createdDaysAgo },
      { status: "CANCELLED", note: "Customer decided to replace the device instead — repair cancelled, no charge.", daysAgo: Math.max(t.createdDaysAgo - 2, 0) },
    ];
  }
  const upTo = t.status === "READY_FOR_PICKUP" ? "COMPLETED" : t.status;
  const idx = PIPELINE.indexOf(upTo);
  const steps = PIPELINE.slice(0, idx + 1).map((status, i) => ({
    status,
    daysAgo: Math.max(t.createdDaysAgo - i, 0),
  }));
  if (t.status === "READY_FOR_PICKUP") {
    steps.push({ status: "READY_FOR_PICKUP", daysAgo: Math.max(t.createdDaysAgo - steps.length, 0) });
  }
  // A closing note on whichever step actually finished the work.
  const last = steps[steps.length - 1];
  if (["COMPLETED", "READY_FOR_PICKUP", "PICKED_UP"].includes(last.status)) {
    (last as { note?: string }).note = "Repair complete, tested and ready.";
  }
  return steps;
}

export async function seedDemoData(prisma: PrismaClient) {
  // ── Shop identity — clearly fictional, so nobody mistakes this for a
  // real shop's data. ─────────────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      { key: "shop_name", value: "Ceylon Device Care" },
      { key: "shop_tagline", value: "Fix. Track. Trust. — this is a demo." },
      { key: "shop_phone", value: "0112345678" },
      { key: "shop_email", value: "hello@demo.mobilux.lk" },
      { key: "shop_address", value: "142 Galle Road, Colombo 03" },
      { key: "shop_hours", value: "Mon–Sat, 9:00 AM – 7:00 PM" },
      // The one real detail on an otherwise fictional shop, and deliberately
      // so: the demo exists to be sold from, and a visitor impressed enough
      // to tap the chat button should reach a person rather than a made-up
      // number. Everything else here stays invented.
      { key: "shop_whatsapp", value: "94719495825" },
      { key: "shop_bank_accounts", value: JSON.stringify([
        { id: "demo-1", bankName: "Demo Bank", branch: "Colombo 03", accountName: "Ceylon Device Care", accountNumber: "0000000000" },
      ]) },
      { key: "phones_storefront_visible", value: "true" },
      { key: "testimonials_section_visible", value: "true" },
    ],
  });

  // ── Accounts ───────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_ACCOUNTS.owner.password, 12);
  // All three demo accounts share one password — it's printed on the
  // sign-in buttons anyway, there's nothing to individually protect.
  await prisma.user.create({
    data: { name: DEMO_ACCOUNTS.owner.name, email: DEMO_ACCOUNTS.owner.email, passwordHash, role: "ADMIN", phone: "0770000001" },
  });
  await prisma.user.create({
    data: { name: DEMO_ACCOUNTS.staff.name, email: DEMO_ACCOUNTS.staff.email, passwordHash, role: "STAFF", phone: "0770000002" },
  });

  const customers = await Promise.all(
    DEMO_CUSTOMERS.map((c) =>
      prisma.user.create({
        data: { name: c.name, email: c.email, phone: c.phone, passwordHash, role: "CUSTOMER" },
      }),
    ),
  );

  // ── Loyalty ────────────────────────────────────────────────────────
  await prisma.discountRule.createMany({
    data: [
      { minRepairs: 3, discountPercent: 5 },
      { minRepairs: 5, discountPercent: 10 },
    ],
  });

  // ── Storefront products ───────────────────────────────────────────
  await prisma.product.createMany({
    data: [
      { name: "Tempered Glass Screen Protector", slug: "tempered-glass-screen-protector", category: "ACCESSORY", description: "9H hardness tempered glass, fitted free at the shop.", price: 1500, stock: 40 },
      { name: "USB-C 30W Fast Charger", slug: "usb-c-30w-fast-charger", category: "ACCESSORY", description: "Genuine 30W USB-C adapter with over-current protection.", price: 4500, stock: 18 },
      { name: "Shockproof Clear Case", slug: "shockproof-clear-case", category: "ACCESSORY", description: "Military-grade drop protection, anti-yellowing clear TPU.", price: 2800, stock: 25 },
      { name: "Braided USB-C Cable 1m", slug: "braided-usb-c-cable-1m", category: "ACCESSORY", description: "Rated for 30,000 bends. 12-month warranty.", price: 2200, stock: 30 },
      { name: "Wireless Earbuds Pro", slug: "wireless-earbuds-pro", category: "ACCESSORY", description: "Bluetooth 5.3, active noise cancellation, IPX4.", price: 8900, stock: 10 },
      { name: "iPhone 12 128GB (Pre-owned, Grade A)", slug: "iphone-12-128gb-demo", category: "PHONE", description: "Fully serviced pre-owned iPhone 12, new battery fitted.", price: 145000, stock: 2 },
      { name: "Samsung Galaxy A54 (Pre-owned, Grade A)", slug: "galaxy-a54-demo", category: "PHONE", description: "Excellent condition, battery health above 90%.", price: 89000, stock: 3 },
    ],
  });
  const products = await prisma.product.findMany();

  // ── Repair tickets ─────────────────────────────────────────────────
  let seq = 1;
  let disputeAttached = false;
  for (const t of TICKETS) {
    const history = historyFor(t);
    const createdAt = daysAgo(t.createdDaysAgo, 9);
    const customerId = t.customer === "walkin" ? null : customers[t.customer].id;
    const isDone = ["COMPLETED", "READY_FOR_PICKUP", "PICKED_UP"].includes(t.status);

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNumber: `DEMO-${String(seq).padStart(4, "0")}`,
        customerId,
        customerName: customerId ? null : t.walkinName,
        deviceType: t.deviceType,
        brand: t.brand,
        model: t.model,
        issueTitle: t.issueTitle,
        issueDescription: t.issueDescription,
        status: t.status,
        estimatedCost: t.estimatedCost || null,
        finalCost: t.finalCost ?? null,
        createdAt,
        completedAt: isDone ? daysAgo(t.createdDaysAgo - history.length + 1, 16) : null,
        technician: isDone ? DEMO_ACCOUNTS.staff.name : null,
        billItems: t.finalCost
          ? [{ label: t.issueTitle, amount: t.finalCost }]
          : undefined,
        billGeneratedAt: t.finalCost ? daysAgo(t.paid?.daysAgo ?? t.createdDaysAgo, 17) : null,
        paidAmount: t.paid ? t.finalCost : null,
        paidAt: t.paid ? daysAgo(t.paid.daysAgo, 14) : null,
        paidMethod: t.paid?.method ?? null,
        statusUpdates: {
          create: history.map((h) => ({
            status: h.status,
            note: h.note ?? null,
            createdAt: daysAgo(h.daysAgo, 12),
          })),
        },
      },
    });

    // The one open dispute — attach to the first IN_PROGRESS ticket.
    if (!disputeAttached && t.status === "IN_PROGRESS") {
      await prisma.repairIssue.create({
        data: {
          ticketId: ticket.id,
          status: "PENDING",
          note: "Found a hairline crack on the mid-frame while removing the back glass — likely pre-existing, but flagging before we go further.",
          solution: "We can fit a replacement mid-frame at no charge to keep the repair moving.",
          reportedAt: daysAgo(0, 11),
        },
      });
      disputeAttached = true;
    }

    seq += 1;
  }

  // ── Reviews ────────────────────────────────────────────────────────
  await prisma.testimonial.createMany({
    data: [
      { userId: customers[2].id, name: customers[2].name, deviceLabel: "iPhone 13 Pro Max · Face ID repair", rating: 5, message: "Quick turnaround and they explained exactly what was wrong. Face ID works perfectly now.", status: "APPROVED", featured: true, reviewedAt: daysAgo(6) },
      { userId: customers[3].id, name: customers[3].name, deviceLabel: "Galaxy S22 · Screen replacement", rating: 5, message: "Screen looks brand new, and the tracking link meant I always knew what stage it was at.", status: "APPROVED", reviewedAt: daysAgo(20) },
      { userId: customers[4].id, name: customers[4].name, deviceLabel: "iPhone XR · Battery replacement", rating: 4, message: "Good price and honest about what my old battery's health actually was.", status: "APPROVED", reviewedAt: daysAgo(24) },
      { userId: customers[0].id, name: customers[0].name, deviceLabel: "Poco X6 · Charging port", rating: 5, message: "Fixed the same day I dropped it off. Highly recommend.", status: "PENDING" },
    ],
  });

  // ── Storefront orders ─────────────────────────────────────────────
  const orderProduct = (i: number) => products[i % products.length];
  for (let i = 0; i < 3; i++) {
    const product = orderProduct(i);
    const qty = 1 + (i % 2);
    await prisma.order.create({
      data: {
        orderNumber: `DEMO-ORD-${String(i + 1).padStart(4, "0")}`,
        userId: customers[i].id,
        status: i === 2 ? "PENDING" : "FULFILLED",
        total: Number(product.price) * qty,
        createdAt: daysAgo(5 + i * 3, 13),
        items: {
          create: [{ productId: product.id, quantity: qty, unitPrice: product.price }],
        },
      },
    });
  }
}
