import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Prisma.TransactionClient | PrismaClient;

// Continues the shop's own REP-### numbering from whatever the highest
// number in use is — whether that came from the legacy import or a
// ticket created in the app. Ignores the internal `seq` autoincrement,
// which can drift from the visible numbering (e.g. after deleted rows).
export async function nextTicketNumber(tx: TxClient): Promise<string> {
  const result = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("ticketNumber" FROM 5) AS INTEGER)) AS max
    FROM "RepairTicket"
    WHERE "ticketNumber" ~ '^REP-[0-9]+$'
  `;
  const max = result[0]?.max ?? 0;
  return `REP-${String(max + 1).padStart(3, "0")}`;
}
