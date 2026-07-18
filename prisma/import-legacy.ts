// One-time import of Mobilux's historical repair records (REP-001..REP-041).
// Idempotent: skips if REP-001 already exists.
// Run: npx tsx prisma/import-legacy.ts   (set DATABASE_URL for production)
import { PrismaClient, DeviceType, TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();

// DD/MM/YYYY → Date (noon Colombo time to avoid TZ date-shift)
function d(s: string): Date {
  const [day, month, year] = s.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 6, 30));
}

type Legacy = {
  id: string;
  owner: string;
  brand?: string;
  model?: string;
  deviceType?: DeviceType;
  issue: string;
  solution: string;
  completed: boolean;
  partsCost?: number; // "Cost" column — what the shop spent
  paid?: number; // "Payment" column — what the customer paid
  date?: string; // Date Completed (DD/MM/YYYY)
  dateEstimated?: boolean; // true when interpolated from neighbours
  createdDate?: string; // only when repair spanned a long duration
  duration?: string;
  parts?: string;
  supplier?: string;
  comments?: string;
  forgottenParts?: string;
};

const records: Legacy[] = [
  { id: "REP-001", owner: "Priyantha Bappa", brand: "Apple", model: "iPhone 8 Plus", issue: "iCloud and Carrier Locked", solution: "Bypassed iCloud and Unlocked Carrier Lock ✨", completed: true, partsCost: 12438, paid: 15000, date: "10/01/2024", supplier: "iRemoval Pro, Phone Style Server" },
  { id: "REP-002", owner: "Dishan's Father", issue: "No Signal", solution: "Reconnected Antenna", completed: true, partsCost: 0, paid: 0, date: "17/01/2024", duration: "1 Day" },
  { id: "REP-003", owner: "Tangalle Phone Shop", issue: "Mic Failure", solution: "Replaced Mic", completed: true, partsCost: 0, paid: 0, date: "20/01/2024", duration: "1 Day", parts: "Mic", supplier: "Tangalle Phone Shop" },
  { id: "REP-004", owner: "Kurulu Mama", brand: "Huawei", issue: "Speaker Failure", solution: "Serviced", completed: true, partsCost: 0, paid: 0, date: "25/01/2024", dateEstimated: true, duration: "1 Day" },
  { id: "REP-005", owner: "Basuru", brand: "Apple", model: "iPhone X", issue: "No Power", solution: "Identified Fault", completed: false, partsCost: 0, paid: 0, date: "01/02/2024" },
  { id: "REP-006", owner: "Basuru", brand: "Samsung", model: "Galaxy A51", issue: "Insert Sim Error", solution: "Serviced", completed: true, partsCost: 0, paid: 0, date: "05/02/2024", duration: "1 Day" },
  { id: "REP-007", owner: "Pramith Ayya", brand: "Redmi", model: "Note 8", issue: "Side Keys Not Functioning", solution: "Replaced Side Keys", completed: true, partsCost: 0, paid: 1500, date: "01/03/2024", dateEstimated: true, duration: "1 Day", parts: "Side Keys" },
  { id: "REP-008", owner: "Punchi Amma", brand: "Nokia", model: "2.2", issue: "Ghost Touch Issue", solution: "Display Replacement", completed: true, partsCost: 4500, paid: 6000, date: "19/03/2024", duration: "1 Day", parts: "Display", supplier: "AMS Cellular" },
  { id: "REP-009", owner: "Hirusha", brand: "Redmi", model: "Note 9s", issue: "Side Keys Not Functioning", solution: "Replaced Side Keys", completed: true, partsCost: 300, paid: 600, date: "10/04/2024", dateEstimated: true, duration: "1 Day", parts: "Side Keys", supplier: "Galaxy Mobile Dickwella" },
  { id: "REP-010", owner: "Sudu Bappa's Malli", brand: "Apple", model: "iPhone 7", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 3500, paid: 0, date: "25/04/2024", dateEstimated: true, duration: "1 Day", parts: "Display", supplier: "AMS Cellular" },
  { id: "REP-011", owner: "Priyantha Bappa", brand: "Samsung", model: "Galaxy J2", issue: "Display Blurred", solution: "Display Replacement", completed: true, partsCost: 3300, paid: 4000, date: "15/05/2024", duration: "1 Day", parts: "Display", supplier: "SP Electronics" },
  { id: "REP-012", owner: "Gayash (own)", brand: "Apple", model: "iPhone Xs", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 9500, paid: 9500, date: "28/06/2024", duration: "1 Day", parts: "Display", supplier: "AMS Cellular" },
  { id: "REP-013", owner: "Priyantha Bappa", brand: "Apple", model: "iPhone 8 Plus", issue: "Home Button Failure", solution: "Replaced Home Button", completed: true, date: "05/07/2024", dateEstimated: true, duration: "1 Day", parts: "Home Button", supplier: "Pettah Shop Near Polek" },
  { id: "REP-014", owner: "Punchi Amma", brand: "Nokia", model: "2.2", issue: "Battery Capacity Loss", solution: "Replaced Battery", completed: true, partsCost: 1530, paid: 2000, date: "16/07/2024", duration: "1 Day", parts: "Battery", supplier: "Vancon Cellular" },
  { id: "REP-015", owner: "Punchi Thaththa", brand: "Samsung", model: "Galaxy Wide 2", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 5650, paid: 5000, date: "20/07/2024", dateEstimated: true, parts: "Display", supplier: "Zoom Mobile Matale" },
  { id: "REP-016", owner: "Punchi Thaththa", issue: "Battery Drain Issue", solution: "Removed Flash Light", completed: false, partsCost: 0, paid: 0, date: "22/07/2024", dateEstimated: true, duration: "1 Day" },
  { id: "REP-017", owner: "Buthmi", brand: "Huawei", issue: "No Power", solution: "Reconnected Battery Pin", completed: true, partsCost: 0, paid: 0, date: "25/07/2024", dateEstimated: true, duration: "1 Day" },
  { id: "REP-018", owner: "Rusira", brand: "Redmi", model: "Note 8", issue: "Mic Failure", solution: "Replaced Charging Flex", completed: true, partsCost: 0, paid: 500, date: "28/07/2024", dateEstimated: true, parts: "Charging Flex" },
  { id: "REP-019", owner: "Yasiru Malli", brand: "Oppo", issue: "Display Cracked", solution: "Display Replacement", completed: true, date: "02/08/2024", parts: "Display" },
  { id: "REP-020", owner: "Rusira", brand: "Redmi", model: "Note 8", issue: "Display Cracked", solution: "Display Replacement", completed: true, date: "05/08/2024", duration: "1 Day", parts: "Display" },
  { id: "REP-021", owner: "Chali Ayya's Nanda", brand: "Apple", model: "iPhone 13 Pro Max", issue: "Yellow Screen Issue", solution: "Added Jumper ✨", completed: true, partsCost: 0, paid: 10000, date: "09/08/2024" },
  { id: "REP-022", owner: "Basuru", brand: "Samsung", model: "Galaxy A12", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 2450, paid: 5000, date: "07/01/2025", parts: "Display", supplier: "Trans Asia Cellular" },
  { id: "REP-023", owner: "Himashi", brand: "Samsung", model: "Galaxy A20s", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 0, paid: 0, date: "13/02/2025", duration: "3 Hours", parts: "Display", supplier: "Trans Asia Cellular", comments: "Returned on 2026/02/05. The display was separated and not working. After inspection, I found the glue was near its expiry date. When removing it, I found it had hardened into a crystal-like texture, and dust may have mixed with it, causing it to fail." },
  { id: "REP-024", owner: "Sudu Amma", brand: "Apple", model: "iPhone 8 Plus", issue: "Display Glitched", solution: "Display Replacement", completed: true, partsCost: 2800, paid: 5000, date: "23/02/2025", duration: "2 Hours", parts: "Display", supplier: "Trans Asia Cellular" },
  { id: "REP-025", owner: "Punchi Amma", brand: "Nokia", model: "2.2", issue: "Display Seperated", solution: "Glued Display", completed: true, partsCost: 0, paid: 0, date: "10/03/2025", duration: "10 Minutes" },
  { id: "REP-026", owner: "Nihal Mama", brand: "Samsung", model: "Galaxy J2", issue: "Power Button doesn't work, Display Cracked", solution: "Power Button Resoldered ✨, Display Replacement", completed: true, partsCost: 2500, paid: 0, date: "18/04/2025", createdDate: "18/04/2024", duration: "1 Year", parts: "Display" },
  { id: "REP-027", owner: "Ayya", brand: "Google", model: "Pixel 6", issue: "Battery Swelling", solution: "Replaced Battery", completed: true, partsCost: 2200, paid: 2200, date: "02/06/2025", duration: "1 Day", parts: "Battery", supplier: "SP Electronics" },
  { id: "REP-028", owner: "Isuri Akka", brand: "Huawei", model: "Y9 2018", issue: "Side Keys Not Functioning", solution: "Replaced Side Keys", completed: true, partsCost: 200, paid: 1500, date: "27/06/2025", duration: "20 Minutes", parts: "Side Keys", supplier: "GSM Father" },
  { id: "REP-029", owner: "Raja Mama", brand: "Samsung", model: "Galaxy A10s", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 2200, paid: 5000, date: "08/07/2025", duration: "2 Hours", parts: "Display", supplier: "Trans Asia Cellular" },
  { id: "REP-030", owner: "Sisil Ayya", brand: "Samsung", model: "Galaxy Grand Prime 4G", issue: "Forgotten Screen Lock, Seperated Display", solution: "FRP Bypass, Glued Display", completed: true, partsCost: 0, paid: 1000, date: "08/07/2025", duration: "1 Day" },
  { id: "REP-031", owner: "Gayash (own)", brand: "Apple", model: "iPhone Xs", issue: "Battery Drained", solution: "Replaced Battery", completed: true, partsCost: 2800, paid: 0, date: "05/09/2025", duration: "2 Hours", parts: "Battery", supplier: "RS Combo", comments: "Forgot to apply the earpiece cover; attempted to reopen the glued display, causing the glass to crack at the top-right corner.", forgottenParts: "Earpiece Cover" },
  { id: "REP-032", owner: "Basuru", brand: "Samsung", model: "Galaxy A12", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 2000, paid: 4000, date: "05/09/2025", duration: "1 Hour", parts: "Display", supplier: "Trans Asia Cellular" },
  { id: "REP-033", owner: "Sandali Akka", brand: "Apple", model: "iPhone 7 Plus", issue: "Battery Voltage Loss", solution: "Hi-Charged Battery", completed: true, partsCost: 0, paid: 0, date: "05/09/2025", duration: "15 Minutes" },
  { id: "REP-034", owner: "Ayya", brand: "Google", model: "Pixel 6", issue: "Display Cracked", solution: "Display Replacement", completed: true, partsCost: 0, paid: 0, date: "18/10/2025", parts: "Display", supplier: "Trans Asia Cellular", comments: "Ayya bought the display in Pettah. On 07.02.2026, Ayya reported that the display's touch is not working on one side." },
  { id: "REP-035", owner: "Dishan", brand: "Redmi", model: "9", issue: "Display Cracked & Phone Edged", solution: "Display Replacement & Middle Housing Structural Correction", completed: true, partsCost: 2250, paid: 4000, date: "15/01/2026", duration: "1 Day", parts: "Display", supplier: "Trans Asia Cellular", comments: "Learned how to realign middle housing. Done by heating the housing at 135 C temperature and bending by hand.", forgottenParts: "Fingerprint Pin Cover" },
  { id: "REP-036", owner: "Renuka Loku Amma", brand: "Huawei", model: "Y9 2019", issue: "Auto Restart & FRP Locked", solution: "FRP Reset ✨, Battery Resistor Jumper", completed: true, partsCost: 900, paid: 3600, date: "25/01/2026", createdDate: "04/01/2026", duration: "3 Weeks", parts: "Back Cover", supplier: "Pettah Street", comments: "Rented Unlock Tool for LKR 500 for 12 hours. Bought Back Cover For LKR 400. After repairing customer told for Mobitel sim signal not working. Remember to tell customer we only provide solutions for asked issues and when unlocking a device, we can't guarantee there wont any errors after unlocking." },
  { id: "REP-037", owner: "Isuri Akka", brand: "Huawei", model: "Y9 2018", issue: "Battery Drained", solution: "Battery Replacement", completed: true, partsCost: 1800, paid: 3000, date: "31/01/2026", duration: "1 Hour", parts: "Battery", supplier: "SP Electronics" },
  { id: "REP-038", owner: "Himashi", brand: "Samsung", model: "A20S", issue: "Display Not Worked", solution: "Display Replacement", completed: true, partsCost: 2600, paid: 5000, date: "06/02/2026", duration: "1 Hour", parts: "Display", supplier: "SK Lanka Holdings", comments: "Glue was applied to the bottom-left and bottom-right sides beneath the display. After the adhesive was applied, some color patches appeared along the edges of the screen and near the upper area.\nOn 11.02.2026, five days later, I followed up with her to check the display. She informed me that the brown color patch had disappeared and that the display was now functioning normally.\nI'm really happy to hear that positive feedback.", forgottenParts: "3 Screws" },
  { id: "REP-039", owner: "Mr. Nimal (Nadeeka Timber Stores)", brand: "Samsung", model: "M01 Core", issue: "Out Keys and SIM Tray Not Available", solution: "Out Keys and SIM Tray Placed", completed: true, partsCost: 200, paid: 1000, date: "12/02/2026", duration: "10 Minutes", parts: "Out Keys and Sim Tray", supplier: "GSM Father and Asha Cellular", comments: "The Sim Tray is not well fitting but its almost fitting." },
  { id: "REP-040", owner: "Kalshan", brand: "Samsung", model: "M01s", issue: "Out Keys Damaged", solution: "Out Keys Replacement", completed: true, partsCost: 100, paid: 400, date: "25/02/2026", duration: "10 Minutes", parts: "Out Keys", supplier: "GSM Father" },
  { id: "REP-041", owner: "Gayash (own)", brand: "Aspor", model: "Power Bank", deviceType: "OTHER", issue: "USB Ports Losen", solution: "Bouthed USB Port Connectors ✨", completed: true, partsCost: 0, paid: 0, date: "17/07/2026", duration: "1 1/2 hours", comments: "Changed the bouth tip. The original tip even cant really burn solder wires. After changing tip, it worked." },
];

async function main() {
  const existing = await prisma.repairTicket.findUnique({
    where: { ticketNumber: "REP-001" },
  });
  if (existing) {
    console.log("Legacy records already imported — nothing to do.");
    return;
  }

  let imported = 0;
  for (const r of records) {
    const completedAt = r.completed && r.date ? d(r.date) : null;
    const createdAt = r.createdDate
      ? d(r.createdDate)
      : r.date
        ? d(r.date)
        : new Date();
    const status: TicketStatus = r.completed ? "PICKED_UP" : "CANCELLED";
    const noteParts: string[] = ["Imported from shop records."];
    if (!r.completed) noteParts.push("Repair was not completed.");
    if (r.dateEstimated) noteParts.push("Date estimated (missing in records).");

    await prisma.repairTicket.create({
      data: {
        ticketNumber: r.id,
        customerId: null,
        customerName: r.owner,
        deviceType: r.deviceType ?? "PHONE",
        brand: r.brand ?? null,
        model: r.model ?? null,
        issueTitle: r.issue,
        solution: r.solution,
        status,
        partsCost: r.partsCost ?? null,
        paidAmount: r.paid ?? null,
        duration: r.duration ?? null,
        partsUsed: r.parts ?? null,
        partsSupplier: r.supplier ?? null,
        adminNotes: r.comments ?? null,
        forgottenParts: r.forgottenParts ?? null,
        createdAt,
        completedAt,
        statusUpdates: {
          create: [
            {
              status,
              note: noteParts.join(" "),
              createdAt: completedAt ?? createdAt,
            },
          ],
        },
      },
    });
    imported += 1;
  }

  console.log(`Imported ${imported} legacy repair records (REP-001..REP-041).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
