import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { fetchBillTicket } from "@/lib/bill-data";
import { BillDocument } from "@/components/bill-document";
import { DownloadBillButton } from "@/components/bill-print-button";

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

  const result = await fetchBillTicket(id);
  if (!result) notFound();

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = result.customerId === session.user.id;
  if (!isAdmin && !isOwner) notFound();

  const backHref = isAdmin
    ? `/admin/tickets/${result.bill.id}`
    : `/repairs/${result.bill.id}`;

  return (
    <div className="min-h-dvh bg-neutral-100 py-10">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <DownloadBillButton
          ticketId={result.bill.id}
          ticketNumber={result.bill.ticketNumber}
        />
      </div>
      <div className="px-4">
        <BillDocument ticket={result.bill} />
      </div>
    </div>
  );
}
