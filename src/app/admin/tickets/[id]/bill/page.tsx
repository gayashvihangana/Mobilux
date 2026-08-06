import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { computeBill } from "@/lib/bill";
import { fetchBillTicket } from "@/lib/bill-data";
import { getDefaultBillShow, getShopInfo, getShopPayTo } from "@/lib/settings";
import { trackQrDataUrl } from "@/lib/track-qr";
import { BillBuilder } from "./bill-builder";

export const metadata: Metadata = {
  title: "Create bill",
};

export default async function CreateBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") notFound();

  const { id } = await params;
  const result = await fetchBillTicket(id);
  if (!result) notFound();

  const totals = computeBill(result.bill);
  const [trackQr, defaultPayTo, defaultShow, shop] = await Promise.all([
    trackQrDataUrl(result.trackToken),
    getShopPayTo(),
    getDefaultBillShow(),
    getShopInfo(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/tickets/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to ticket
      </Link>

      <div>
        <p className="font-mono text-sm text-muted-foreground">
          {result.bill.ticketNumber}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Create bill
        </h1>
        <p className="mt-1 text-muted-foreground">
          Build the itemised bill, generate it, then send it to{" "}
          {result.bill.customer?.name ?? result.bill.customerName ?? "the customer"}.
          Mark it paid once they&apos;ve settled to turn it into a receipt.
        </p>
      </div>

      <BillBuilder
        ticketId={id}
        bill={result.bill}
        shop={shop}
        trackQr={trackQr}
        defaultPayTo={defaultPayTo}
        defaultShow={defaultShow}
        isSettled={totals.isSettled}
        currentTotal={totals.total}
        paidDate={totals.paidDate ? totals.paidDate.toISOString() : null}
        paidMethod={totals.paidMethod}
        hasOnlinePayment={result.bill.paidPayment !== null}
      />
    </div>
  );
}
