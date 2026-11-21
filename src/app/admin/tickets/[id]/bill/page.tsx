import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { invoicePath } from "@/lib/bill";
import { fetchBillTicket } from "@/lib/bill-data";
import { SITE_URL } from "@/lib/config";
import { getDefaultBillShow, getShopInfo, getShopPayTo } from "@/lib/settings";
import { trackQrDataUrl } from "@/lib/track-qr";
import { BillBuilder } from "./bill-builder";

export const metadata: Metadata = {
  title: "Bill",
};

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("bill:write");

  const { id } = await params;
  const result = await fetchBillTicket(id);
  if (!result) notFound();

  const [trackQr, defaultPayTo, defaultShow, shop] = await Promise.all([
    trackQrDataUrl(result.trackToken),
    getShopPayTo(),
    getDefaultBillShow(),
    getShopInfo(),
  ]);

  return (
    <BillBuilder
      ticketId={id}
      bill={result.bill}
      shop={shop}
      trackQr={trackQr}
      defaultPayTo={defaultPayTo}
      defaultShow={defaultShow}
      partsCost={result.partsCost}
      invoiceUrl={`${SITE_URL}${invoicePath(result.trackToken)}`}
      customerPhone={result.bill.customerPhone || result.bill.customer?.phone || null}
    />
  );
}
