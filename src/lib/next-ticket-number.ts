import type { Prisma, PrismaClient } from "@prisma/client";
import { getShopInfo } from "@/lib/settings";

type TxClient = Prisma.TransactionClient | PrismaClient;

// Continues the shop's own numbering (REP-001, REP-002…) from the highest
// number in use with the current prefix — whether that came from the legacy
// import or a ticket created in the app. The prefix is set under Settings →
// Repairs; changing it starts a fresh run at 001. Ignores the internal `seq`
// autoincrement, which can drift from the visible numbering (e.g. after
// deleted rows).
export async function nextTicketNumber(tx: TxClient): Promise<string> {
  const { ticketPrefix } = await getShopInfo();
  // Saved prefixes are 2–6 capital letters, so they are safe inside a regex.
  const prefix = /^[A-Z]{2,6}$/.test(ticketPrefix) ? ticketPrefix : "REP";
  const result = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("ticketNumber" FROM ${prefix.length + 2}::int) AS INTEGER)) AS max
    FROM "RepairTicket"
    WHERE "ticketNumber" ~ ${`^${prefix}-[0-9]+$`}
  `;
  const max = result[0]?.max ?? 0;
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
