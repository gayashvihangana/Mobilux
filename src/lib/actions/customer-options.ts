"use server";

import { actionPermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export type CustomerChoice = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

// Registered customers for the Customer box on the new-repair forms, so a
// repair can be linked to the person's account. Staff who can add repairs
// only; blocked accounts are left out.
export async function customerChoices(): Promise<CustomerChoice[]> {
  if (!(await actionPermission("repair:write"))) return [];
  return prisma.user.findMany({
    where: { role: "CUSTOMER", blocked: false },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
    take: 5000,
  });
}
