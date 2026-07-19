import { CheckCircle2, Clock, Smartphone } from "lucide-react";
import { SHOP, WARRANTY_DAYS } from "@/lib/config";
import { computeBill, type BillTicket } from "@/lib/bill";
import { STATUS_META } from "@/lib/status";
import { cn, formatDate, formatLKR } from "@/lib/utils";

export type { BillTicket };

// Hardcoded light "paper" palette — a printed bill should look the
// same regardless of the site's dark/light theme.
export function BillDocument({
  ticket,
  trackQr,
}: {
  ticket: BillTicket;
  trackQr?: string;
}) {
  const {
    deviceName,
    owner,
    billDate,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    isSettled,
    warrantyExpiry,
  } = computeBill(ticket);

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-xl print:rounded-none print:border-0 print:shadow-none">
      {/* Header band */}
      <div className="flex items-start justify-between gap-6 bg-blue-600 px-8 py-7 text-white sm:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/15">
            <Smartphone className="size-5" />
          </span>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">
              {SHOP.name}
            </p>
            <p className="text-xs text-blue-100">Fix. Track. Trust.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium tracking-widest text-blue-100 uppercase">
            Invoice
          </p>
          <p className="font-display text-lg font-bold">
            {ticket.ticketNumber}
          </p>
          <p className="text-xs text-blue-100">{formatDate(billDate)}</p>
        </div>
      </div>

      <div className="space-y-8 px-8 py-8 sm:px-10">
        {/* Billed to / From */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              Billed to
            </p>
            <p className="mt-1.5 font-semibold">{owner}</p>
            {ticket.customer?.email ? (
              <p className="text-sm text-neutral-500">{ticket.customer.email}</p>
            ) : null}
            {ticket.customer?.phone ? (
              <p className="text-sm text-neutral-500">{ticket.customer.phone}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              From
            </p>
            <p className="mt-1.5 font-semibold">{SHOP.name}</p>
            <p className="text-sm text-neutral-500">{SHOP.city}</p>
            <p className="text-sm text-neutral-500">{SHOP.phone}</p>
            <p className="text-sm text-neutral-500">{SHOP.email}</p>
          </div>
        </div>

        {/* Device summary */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-neutral-400 uppercase">Device</p>
              <p className="mt-0.5 font-medium">{deviceName}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-400 uppercase">Issue</p>
              <p className="mt-0.5 font-medium">{ticket.issueTitle}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-400 uppercase">Status</p>
              <p className="mt-0.5 font-medium">
                {STATUS_META[ticket.status].label}
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] tracking-widest text-neutral-400 uppercase">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-100">
              <td className="py-3.5 align-top">
                <p className="font-medium">
                  {ticket.solution || ticket.issueTitle}
                </p>
                {ticket.partsUsed ? (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Parts: {ticket.partsUsed}
                  </p>
                ) : null}
              </td>
              <td className="py-3.5 text-right align-top font-medium whitespace-nowrap">
                {formatLKR(subtotal)}
              </td>
            </tr>
            {discountAmount > 0 ? (
              <tr className="border-b border-neutral-100">
                <td className="py-2.5 text-blue-600">
                  Loyalty discount ({discountPercent}%)
                </td>
                <td className="py-2.5 text-right whitespace-nowrap text-blue-600">
                  −{formatLKR(discountAmount)}
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 text-right font-semibold">Total</td>
              <td className="font-display pt-4 text-right text-xl font-bold whitespace-nowrap">
                {formatLKR(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payment status */}
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border p-4",
            isSettled
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50",
          )}
        >
          <div className="flex items-center gap-2.5">
            {isSettled ? (
              <CheckCircle2 className="size-5 text-green-600" />
            ) : (
              <Clock className="size-5 text-amber-600" />
            )}
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isSettled ? "text-green-700" : "text-amber-700",
                )}
              >
                {isSettled ? "Paid in full" : "Balance due"}
              </p>
              {ticket.paidPayment ? (
                <p className="text-xs text-neutral-500">
                  Confirmed {formatDate(ticket.paidPayment.createdAt)}
                </p>
              ) : null}
            </div>
          </div>
          <p
            className={cn(
              "font-display text-lg font-bold",
              isSettled ? "text-green-700" : "text-amber-700",
            )}
          >
            {formatLKR(total)}
          </p>
        </div>

        {/* Scan-to-track */}
        {trackQr ? (
          <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- static data URL */}
            <img
              src={trackQr}
              alt={`QR code to track repair ${ticket.ticketNumber}`}
              className="size-20 shrink-0 rounded-md border border-neutral-200 bg-white p-1"
            />
            <div>
              <p className="text-sm font-semibold">Track this repair anytime</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Scan the code or visit {SHOP.name.toLowerCase()} online and
                enter ticket {ticket.ticketNumber} — live status, no sign-in
                needed.
              </p>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="space-y-1 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400">
          {warrantyExpiry ? (
            <p>
              Covered by a {WARRANTY_DAYS}-day service warranty, valid until{" "}
              {formatDate(warrantyExpiry)}.
            </p>
          ) : (
            <p>Covered by a {WARRANTY_DAYS}-day service warranty from completion.</p>
          )}
          <p>Thank you for trusting {SHOP.name} with your device.</p>
        </div>
      </div>
    </div>
  );
}
