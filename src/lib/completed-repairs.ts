import type { Prisma, TicketStatus } from "@prisma/client";

// A repair counts toward loyalty once it reaches any of these.
export const DONE_TICKET_STATUSES: TicketStatus[] = [
  "COMPLETED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
];

// User.completedRepairs is a denormalized counter. Recounting from the
// tickets (instead of incrementing) keeps it correct when statuses skip
// COMPLETED, tickets are re-linked or deleted, and self-heals any counts
// that drifted before this existed.
export async function syncCompletedRepairs(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const count = await tx.repairTicket.count({
    where: { customerId: userId, status: { in: DONE_TICKET_STATUSES } },
  });
  await tx.user.update({
    where: { id: userId },
    data: { completedRepairs: count },
  });
}
