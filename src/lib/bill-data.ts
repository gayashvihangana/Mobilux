import { prisma } from "@/lib/prisma";
import type { BillTicket } from "@/lib/bill";

// Shared by the bill page and the PDF download route so both always
// render from identical data.
export async function fetchBillTicket(
  id: string,
): Promise<{ bill: BillTicket; customerId: string | null } | null> {
  const ticket = await prisma.repairTicket.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      payments: {
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { amount: true, createdAt: true },
      },
    },
  });
  if (!ticket) return null;

  return {
    customerId: ticket.customerId,
    bill: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      brand: ticket.brand,
      model: ticket.model,
      issueTitle: ticket.issueTitle,
      solution: ticket.solution,
      status: ticket.status,
      createdAt: ticket.createdAt,
      completedAt: ticket.completedAt,
      finalCost: ticket.finalCost?.toString() ?? null,
      estimatedCost: ticket.estimatedCost?.toString() ?? null,
      paidAmount: ticket.paidAmount?.toString() ?? null,
      discountPercent: ticket.discountPercent?.toString() ?? null,
      partsUsed: ticket.partsUsed,
      customerName: ticket.customerName,
      customer: ticket.customer,
      paidPayment: ticket.payments[0]
        ? {
            amount: ticket.payments[0].amount.toString(),
            createdAt: ticket.payments[0].createdAt,
          }
        : null,
    },
  };
}
