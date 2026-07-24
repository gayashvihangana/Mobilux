import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { fetchBillTicket } from "@/lib/bill-data";
import { trackQrDataUrl } from "@/lib/track-qr";
import { BillDocument } from "@/components/bill-document";
import { AutoPrint, DownloadBillButton } from "@/components/bill-print-button";

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

  const trackQr = await trackQrDataUrl(result.bill.ticketNumber);

  return (
    <div className="min-h-dvh bg-neutral-100 py-10 print:bg-white print:py-0">
      {/* Print rules: only the bill prints, on a clean A4 page. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #ffffff !important; }
        }
      `}</style>
      <Suspense>
        <AutoPrint />
      </Suspense>
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <DownloadBillButton />
      </div>
      <div className="px-4 print:px-0">
        <BillDocument ticket={result.bill} trackQr={trackQr} />
      </div>
    </div>
  );
}
