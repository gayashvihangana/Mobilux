import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BillDocument } from "@/components/bill-document";
import { PrintBillButton } from "@/components/bill-print-button";

export const metadata: Metadata = {
  title: "Bill",
};

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

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
  if (!ticket) notFound();

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = ticket.customerId === session.user.id;
  if (!isAdmin && !isOwner) notFound();

  const backHref = isAdmin ? `/admin/tickets/${ticket.id}` : `/repairs/${ticket.id}`;

  return (
    <div className="min-h-dvh bg-neutral-100 py-10 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <PrintBillButton />
      </div>
      <div className="px-4">
        <BillDocument
          ticket={{
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
          }}
        />
      </div>
    </div>
  );
}
