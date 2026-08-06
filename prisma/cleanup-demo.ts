// Removes demo seed data while keeping kasun@example.com as a test account.
// Deletes: Kasun's fake REP- tickets from seed.ts (cascades status
// updates/payments), demo orders, and related notifications. Resets
// Kasun's repair counter.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const kasun = await prisma.user.findUnique({
    where: { email: "kasun@example.com" },
  });
  if (!kasun) {
    console.log("No kasun@example.com user — nothing to clean.");
    return;
  }

  const tickets = await prisma.repairTicket.deleteMany({
    where: { customerId: kasun.id, ticketNumber: { startsWith: "REP-" } },
  });

  // Restore stock reserved by demo orders before deleting them
  const demoOrders = await prisma.order.findMany({
    where: { userId: kasun.id },
    include: { items: true },
  });
  for (const order of demoOrders) {
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }
  const orders = await prisma.order.deleteMany({
    where: { userId: kasun.id },
  });
  await prisma.notification.deleteMany({ where: { userId: kasun.id } });
  await prisma.user.update({
    where: { id: kasun.id },
    data: { completedRepairs: 0 },
  });

  console.log(
    `Removed ${tickets.count} demo tickets and ${orders.count} demo orders. Kasun kept as test account.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
