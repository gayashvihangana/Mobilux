import { Building2, ShieldCheck, Smartphone } from "lucide-react";
import { SHOP } from "@/lib/config";
import { computeBill, type BillTicket } from "@/lib/bill";
import { doneLabel } from "@/lib/status";
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
    technician,
    billDate,
    isItemized,
    items,
    subtotal,
    discountLabel,
    discountAmount,
    total,
    isSettled,
    paidDate,
    paidMethod,
    payTo,
    show,
  } = computeBill(ticket);

  const showSubtotal = isItemized && (items.length > 1 || discountAmount > 0);
  const showTechnician = show.technician && !!technician;
  const showDeviceBox = show.device || show.status || showTechnician;
  const showIssue = show.issue && !!ticket.issueTitle;
  const showSolution = show.solution && !!ticket.solution;
  const showWarranty = show.warranty && !!ticket.warrantyPeriod;
  const paidMeta = [paidMethod, paidDate ? formatDate(paidDate) : null]
    .filter(Boolean)
    .join(" · ");

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
        {showDeviceBox ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              {show.device ? (
                <div>
                  <p className="text-[11px] text-neutral-400 uppercase">Device</p>
                  <p className="mt-0.5 font-medium">{deviceName}</p>
                </div>
              ) : null}
              {show.status ? (
                <div>
                  <p className="text-[11px] text-neutral-400 uppercase">Status</p>
                  <p className="mt-0.5 font-medium">{doneLabel(ticket.status)}</p>
                </div>
              ) : null}
              {showTechnician ? (
                <div>
                  <p className="text-[11px] text-neutral-400 uppercase">
                    Technician
                  </p>
                  <p className="mt-0.5 font-medium">{technician}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Repair details — issue & what we did */}
        {showIssue || showSolution ? (
          <div className="grid gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2">
            {showIssue ? (
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
                  Issue
                </p>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {ticket.issueTitle}
                </p>
              </div>
            ) : null}
            {showSolution ? (
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
                  What we did
                </p>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {ticket.solution}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Line items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] tracking-widest text-neutral-400 uppercase">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isItemized ? (
              items.map((item, i) => (
                <tr key={`${item.label}-${i}`} className="border-b border-neutral-100">
                  <td className="py-3 align-top font-medium">{item.label}</td>
                  <td className="py-3 text-right align-top font-medium whitespace-nowrap">
                    {formatLKR(item.amount)}
                  </td>
                </tr>
              ))
            ) : (
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
            )}
            {showSubtotal ? (
              <tr>
                <td className="pt-3 text-right text-neutral-500">Subtotal</td>
                <td className="pt-3 text-right whitespace-nowrap text-neutral-600">
                  {formatLKR(subtotal)}
                </td>
              </tr>
            ) : null}
            {discountAmount > 0 ? (
              <tr>
                <td className="py-1.5 text-right text-blue-600">
                  {discountLabel}
                </td>
                <td className="py-1.5 text-right whitespace-nowrap text-blue-600">
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

        {/* PAID seal — horizontal, straight after the total */}
        {isSettled ? (
          <div className="flex justify-center">
            <div className="rounded-md border-[3px] border-green-600/70 px-8 py-2 text-center">
              <p className="text-2xl leading-none font-black tracking-[0.25em] text-green-600/80 uppercase">
                Paid
              </p>
              {paidMeta ? (
                <p className="mt-1 text-[10px] font-medium tracking-widest text-green-700/70 uppercase">
                  {paidMeta}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700">Balance due</p>
            <p className="font-display text-lg font-bold text-amber-700">
              {formatLKR(total)}
            </p>
          </div>
        )}

        {/* How to pay — only while there's a balance due */}
        {!isSettled && show.payment && total > 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-neutral-500" />
              <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
                How to pay
              </p>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              Transfer to the account below and keep your receipt, or pay in
              store. Quote{" "}
              <span className="font-medium text-neutral-900">
                {ticket.ticketNumber}
              </span>{" "}
              as the reference.
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] text-neutral-400 uppercase">Bank</p>
                <p className="mt-0.5 font-medium">{payTo.bankName}</p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase">Branch</p>
                <p className="mt-0.5 font-medium">{payTo.branch}</p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase">
                  Account name
                </p>
                <p className="mt-0.5 font-medium">{payTo.accountName}</p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-400 uppercase">
                  Account number
                </p>
                <p className="mt-0.5 font-mono font-medium">
                  {payTo.accountNumber}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Warranty — only when enabled and a period is set */}
        {showWarranty ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-neutral-500" />
              <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
                Warranty
              </p>
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              <span className="font-medium">{ticket.warrantyPeriod}</span>{" "}
              warranty
              {ticket.warrantyParts ? (
                <> on {ticket.warrantyParts}</>
              ) : null}
              .
            </p>
          </div>
        ) : null}

        {/* Notes (diagnosis, cancellation reason, etc.) */}
        {show.notes && ticket.billNotes ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              Notes
            </p>
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
              {ticket.billNotes}
            </p>
          </div>
        ) : null}

        {/* Scan-to-track */}
        {show.track && trackQr ? (
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
          <p>Thank you for trusting {SHOP.name} with your device.</p>
        </div>
      </div>
    </div>
  );
}
