import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { invoiceNumber } from "@/lib/bill";
import { fetchBillTicket } from "@/lib/bill-data";
import { trackQrDataUrl } from "@/lib/track-qr";
import { BillDocument } from "@/components/bill-document";
import { AutoPrint, DownloadBillButton } from "@/components/bill-print-button";

// The page title becomes the default filename Chrome suggests in its
// "Save as PDF" dialog, so build a descriptive one from the bill itself —
// e.g. "John Doe - iPhone 13 - Invoice INV-0044". `absolute` skips the
// site-wide "%s | Mobilux" template to keep the filename clean.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ticket = await prisma.repairTicket.findUnique({
    where: { id },
    select: {
      ticketNumber: true,
      brand: true,
      model: true,
      customerName: true,
      paidAt: true,
      customer: { select: { name: true } },
      payments: { where: { status: "PAID" }, take: 1, select: { id: true } },
    },
  });
  if (!ticket) return { title: "Bill" };

  const owner = ticket.customer?.name ?? ticket.customerName ?? "Customer";
  const device = [ticket.brand, ticket.model].filter(Boolean).join(" ");
  const settled = !!ticket.paidAt || ticket.payments.length > 0;
  const kind = settled ? "Receipt" : "Invoice";
  const label = [owner, device]
    .filter(Boolean)
    .concat(`${kind} ${invoiceNumber(ticket.ticketNumber)}`)
    .join(" - ");
  return { title: { absolute: label } };
}

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // This route sits outside both guarded layouts — there is no `bill/layout.tsx`
  // above it — so it has to run the live account check itself. Reading the
  // cookie alone would leave a blocked customer, or a session that a password
  // change was supposed to end, able to open the bill until the token expires.
  const user = await requireUser();

  const { id } = await params;

  const result = await fetchBillTicket(id);
  if (!result) notFound();

  const isAdmin = user.role === "ADMIN";
  const isOwner = result.customerId === user.id;
  if (!isAdmin && !isOwner) notFound();

  const backHref = isAdmin
    ? `/admin/tickets/${result.bill.id}`
    : `/repairs/${result.bill.id}`;

  const trackQr = await trackQrDataUrl(result.trackToken);

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
