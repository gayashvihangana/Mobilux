"use server";

import { actionUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// The brands and models this shop has saved on repairs, so a model typed in
// once (a new "Galaxy S27") is offered in the Model box next time. Only the
// two device names are returned, never anything about who owned the device.
export async function deviceSuggestions(): Promise<
  { brand: string; model: string | null }[]
> {
  const user = await actionUser();
  if (!user) return [];
  const rows = await prisma.repairTicket.findMany({
    where: { brand: { not: null } },
    distinct: ["brand", "model"],
    select: { brand: true, model: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  return rows.map((r) => ({ brand: r.brand ?? "", model: r.model }));
}
