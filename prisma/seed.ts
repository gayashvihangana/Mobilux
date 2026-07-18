import { PrismaClient, TicketStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const daysAgo = (n: number, hours = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hours, 0, 0, 0);
  return d;
};

async function main() {
  // ── Users ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@mobilux.lk" },
    update: {},
    create: {
      name: "Gayash",
      email: "admin@mobilux.lk",
      passwordHash: adminPassword,
      role: "ADMIN",
      phone: "0771234567",
    },
  });

  const customerPassword = await bcrypt.hash("Customer@123", 12);
  const customer = await prisma.user.upsert({
    where: { email: "kasun@example.com" },
    update: {},
    create: {
      name: "Kasun Perera",
      email: "kasun@example.com",
      passwordHash: customerPassword,
      role: "CUSTOMER",
      phone: "0712345678",
      completedRepairs: 2,
    },
  });

  // ── Discount rules ─────────────────────────────────────
  await prisma.discountRule.upsert({
    where: { minRepairs: 3 },
    update: {},
    create: { minRepairs: 3, discountPercent: 5 },
  });
  await prisma.discountRule.upsert({
    where: { minRepairs: 5 },
    update: {},
    create: { minRepairs: 5, discountPercent: 10 },
  });

  // ── Sample tickets ─────────────────────────────────────
  const existing = await prisma.repairTicket.count();
  if (existing > 0) {
    console.log("Tickets already exist — skipping ticket seed.");
    return;
  }

  type SeedTicket = {
    brand: string;
    model: string;
    issueTitle: string;
    issueDescription: string;
    status: TicketStatus;
    createdDaysAgo: number;
    estimatedCost?: number;
    finalCost?: number;
    history: { status: TicketStatus; note?: string; daysAgo: number; hours?: number }[];
  };

  const tickets: SeedTicket[] = [
    {
      brand: "Apple",
      model: "iPhone 14 Pro",
      issueTitle: "Cracked screen after drop",
      issueDescription:
        "Dropped the phone on concrete yesterday. Screen is shattered in the top-right corner but the display and touch still work. No other visible damage.",
      status: "IN_PROGRESS",
      createdDaysAgo: 2,
      estimatedCost: 68000,
      history: [
        { status: "RECEIVED", daysAgo: 2, hours: 9 },
        { status: "DIAGNOSING", note: "Front glass shattered, OLED intact. Quoting glass-only replacement.", daysAgo: 2, hours: 11 },
        { status: "IN_PROGRESS", note: "Replacement glass fitted, bonding in progress.", daysAgo: 1, hours: 15 },
      ],
    },
    {
      brand: "Samsung",
      model: "Galaxy S23",
      issueTitle: "Battery drains within 3 hours",
      issueDescription:
        "Battery went from lasting a full day to barely 3 hours over the last month. Gets warm while charging. No drops or water damage.",
      status: "AWAITING_PARTS",
      createdDaysAgo: 4,
      estimatedCost: 24000,
      history: [
        { status: "RECEIVED", daysAgo: 4, hours: 10 },
        { status: "DIAGNOSING", note: "Battery health at 61%. Replacement recommended.", daysAgo: 4, hours: 14 },
        { status: "AWAITING_PARTS", note: "Genuine battery ordered — arriving in 2 days.", daysAgo: 3, hours: 9 },
      ],
    },
    {
      brand: "Apple",
      model: "iPhone 12",
      issueTitle: "Charging port loose",
      issueDescription:
        "Cable has to be held at an angle to charge. Port feels loose. Started after using a cheap third-party cable for a few months.",
      status: "READY_FOR_PICKUP",
      createdDaysAgo: 6,
      estimatedCost: 15000,
      finalCost: 15000,
      history: [
        { status: "RECEIVED", daysAgo: 6, hours: 9 },
        { status: "DIAGNOSING", note: "Lightning port worn out. Replacement needed.", daysAgo: 6, hours: 12 },
        { status: "IN_PROGRESS", daysAgo: 5, hours: 10 },
        { status: "COMPLETED", note: "New port fitted and tested at 20W fast charge.", daysAgo: 5, hours: 16 },
        { status: "READY_FOR_PICKUP", note: "Ready to collect any day 9 AM – 7 PM.", daysAgo: 4, hours: 9 },
      ],
    },
    {
      brand: "Xiaomi",
      model: "Redmi Note 12",
      issueTitle: "Phone fell in water — won't turn on",
      issueDescription:
        "Fell into a bucket of water for a few seconds. Dried it with rice for a day but it still won't power on at all.",
      status: "PICKED_UP",
      createdDaysAgo: 20,
      estimatedCost: 18000,
      finalCost: 21500,
      history: [
        { status: "RECEIVED", daysAgo: 20, hours: 11 },
        { status: "DIAGNOSING", note: "Corrosion on the power IC. Ultrasonic clean + IC rework needed.", daysAgo: 20, hours: 15 },
        { status: "IN_PROGRESS", daysAgo: 19, hours: 10 },
        { status: "COMPLETED", note: "Board cleaned, power IC reworked, battery replaced. All functions tested.", daysAgo: 17, hours: 17 },
        { status: "READY_FOR_PICKUP", daysAgo: 16, hours: 9 },
        { status: "PICKED_UP", note: "Collected. 30-day warranty active.", daysAgo: 15, hours: 18 },
      ],
    },
    {
      brand: "OnePlus",
      model: "Nord CE 3",
      issueTitle: "Speaker crackling at high volume",
      issueDescription:
        "Bottom speaker crackles and distorts at anything above half volume. Earpiece is fine. No water contact that I know of.",
      status: "PICKED_UP",
      createdDaysAgo: 45,
      estimatedCost: 9500,
      finalCost: 9500,
      history: [
        { status: "RECEIVED", daysAgo: 45, hours: 10 },
        { status: "DIAGNOSING", daysAgo: 45, hours: 13 },
        { status: "IN_PROGRESS", daysAgo: 44, hours: 9 },
        { status: "COMPLETED", note: "Loudspeaker module replaced.", daysAgo: 44, hours: 15 },
        { status: "READY_FOR_PICKUP", daysAgo: 43, hours: 9 },
        { status: "PICKED_UP", daysAgo: 42, hours: 12 },
      ],
    },
  ];

  let seq = 1;
  for (const t of tickets) {
    const createdAt = daysAgo(t.createdDaysAgo, 9);
    const completedEntry = t.history.find((h) => h.status === "COMPLETED");
    await prisma.repairTicket.create({
      data: {
        ticketNumber: `MBX-${String(seq).padStart(4, "0")}`,
        customerId: customer.id,
        deviceType: "PHONE",
        brand: t.brand,
        model: t.model,
        issueTitle: t.issueTitle,
        issueDescription: t.issueDescription,
        status: t.status,
        estimatedCost: t.estimatedCost,
        finalCost: t.finalCost,
        createdAt,
        completedAt: completedEntry
          ? daysAgo(completedEntry.daysAgo, completedEntry.hours ?? 12)
          : null,
        statusUpdates: {
          create: t.history.map((h) => ({
            status: h.status,
            note: h.note ?? null,
            createdAt: daysAgo(h.daysAgo, h.hours ?? 12),
          })),
        },
      },
    });
    seq += 1;
  }

  console.log(`Seeded ${tickets.length} tickets for ${customer.email}`);
  console.log("Admin login:    admin@mobilux.lk / Admin@123");
  console.log("Customer login: kasun@example.com / Customer@123");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
