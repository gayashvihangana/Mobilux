import { SHOP, BILL_QUOTE, WARRANTY_TERMS } from "@/lib/config";
import { computeBill, invoiceNumber, type BillTicket } from "@/lib/bill";
import { doneLabel } from "@/lib/status";
import { formatDate, formatLKR, formatPhoneIntl, formatTime } from "@/lib/utils";

export type { BillTicket };

// A classic, print-ready invoice on white "paper" — serif letterhead, a
// meta block (invoice no. / repair id / date / time) top-right, and a
// warranty + thank-you footer. Looks the same regardless of site theme.
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
    warrantyEnd,
  } = computeBill(ticket);

  const showSubtotal = isItemized && (items.length > 1 || discountAmount > 0);
  const showTechnician = show.technician && !!technician;
  const showDeviceBox = show.device || show.status;
  const showIssue = show.issue && !!ticket.issueTitle;
  const showSolution = show.solution && !!ticket.solution;
  const showWarranty = show.warranty && !!ticket.warrantyPeriod;
  // Only issues the customer was actually told about belong on the bill —
  // a withdrawn report never existed as far as the invoice is concerned.
  const billIssues = ticket.issues.filter((i) => i.note.trim().length > 0);
  const showRepairIssue = show.repairIssue && billIssues.length > 0;
  const phone = ticket.customer?.phone ?? null;
  const paidMeta = [paidMethod, paidDate ? formatDate(paidDate) : null]
    .filter(Boolean)
    .join(" · ");

  const meta: { label: string; value: string }[] = [
    { label: "Invoice No.", value: invoiceNumber(ticket.ticketNumber) },
    { label: "Repair ID", value: ticket.ticketNumber },
    { label: "Date", value: formatDate(billDate) },
    { label: "Time", value: formatTime(billDate) },
  ];

  return (
    <div
      className="mx-auto max-w-3xl overflow-hidden rounded-sm border border-neutral-300 bg-white text-neutral-800 shadow-xl print:rounded-none print:border-0 print:shadow-none"
      style={{
        fontFamily:
          "var(--font-newsreader), Georgia, 'Times New Roman', Times, serif",
      }}
    >
      <div className="px-9 py-9 sm:px-12">
        {/* ── Letterhead ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-3xl font-bold tracking-tight text-neutral-900">
              {SHOP.name}
            </p>
            <p className="mt-0.5 text-sm tracking-wide text-neutral-500 italic">
              {SHOP.tagline}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              {SHOP.city}
              <br />
              {SHOP.phone} · {SHOP.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-[0.3em] text-neutral-900 uppercase">
              Invoice
            </p>
            <dl className="mt-3 space-y-1 text-xs">
              {meta.map((m) => (
                <div
                  key={m.label}
                  className="flex items-baseline justify-end gap-3"
                >
                  <dt className="text-neutral-400 uppercase">{m.label}</dt>
                  <dd className="min-w-24 text-right font-semibold text-neutral-800 tabular-nums">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="my-7 border-t-2 border-neutral-800" />

        {/* ── Parties: Bill to / Technician ─────────────────── */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              Bill to
            </p>
            <p className="mt-1.5 text-base font-semibold text-neutral-900">
              {owner}
            </p>
            {phone ? (
              <p className="text-sm text-neutral-500">
                {formatPhoneIntl(phone)}
              </p>
            ) : null}
            {ticket.customer?.email ? (
              <p className="text-sm text-neutral-500">{ticket.customer.email}</p>
            ) : null}
          </div>
          {showTechnician ? (
            <div className="text-right">
              <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
                Served by
              </p>
              <p className="mt-1.5 text-base font-semibold text-neutral-900">
                {technician}
              </p>
              <p className="text-sm text-neutral-500">Technician</p>
            </div>
          ) : null}
        </div>

        {/* ── Device / status ───────────────────────────────── */}
        {showDeviceBox ? (
          <div className="mt-7 grid gap-3 border-y border-neutral-200 py-4 text-sm sm:grid-cols-2">
            {show.device ? (
              <div className="flex gap-2">
                <span className="text-neutral-400">Device:</span>
                <span className="font-semibold text-neutral-800">
                  {deviceName}
                </span>
              </div>
            ) : null}
            {show.status ? (
              <div className="flex gap-2 sm:justify-end">
                <span className="text-neutral-400">Status:</span>
                <span className="font-semibold text-neutral-800">
                  {doneLabel(ticket.status)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Repair details ────────────────────────────────── */}
        {showIssue || showSolution ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {showIssue ? (
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
                  Reported issue
                </p>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {ticket.issueTitle}
                </p>
              </div>
            ) : null}
            {showSolution ? (
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
                  Work carried out
                </p>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {ticket.solution}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Issue during the repair (free-of-charge work) ─── */}
        {showRepairIssue ? (
          <div className="mt-6 break-inside-avoid border-l-2 border-neutral-800 bg-neutral-50 py-3 pr-4 pl-4">
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              Issue during the repair
            </p>
            <div className="mt-2 space-y-3">
              {billIssues.map((issue, i) => (
                <div key={i} className="text-sm">
                  <p className="leading-relaxed whitespace-pre-wrap text-neutral-700">
                    <span className="font-semibold text-neutral-800">
                      What happened:{" "}
                    </span>
                    {issue.note}
                  </p>
                  {issue.solution ? (
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap text-neutral-700">
                      <span className="font-semibold text-neutral-800">
                        Put right at no charge:{" "}
                      </span>
                      {issue.solution}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-neutral-500">
                    {issue.status === "ACCEPTED"
                      ? "Free fix approved by the customer and completed."
                      : issue.status === "DECLINED"
                        ? "The customer chose not to continue — a refund was agreed."
                        : "Awaiting the customer's decision."}
                  </p>
                </div>
              ))}
            </div>
            {ticket.issueWarranty ? (
              <p className="mt-3 text-sm text-neutral-700">
                <span className="font-semibold text-neutral-800">
                  Warranty on this work:{" "}
                </span>
                {ticket.issueWarranty}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-neutral-500">
              Nothing above has been charged on this invoice — replacement parts
              and labour for it were covered by us.
            </p>
          </div>
        ) : null}

        {/* ── Line items ────────────────────────────────────── */}
        <table className="mt-7 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-800 text-left text-[11px] tracking-widest text-neutral-500 uppercase">
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isItemized ? (
              items.map((item, i) => (
                <tr
                  key={`${item.label}-${i}`}
                  className="border-b border-neutral-200"
                >
                  <td className="py-3 align-top text-neutral-800">
                    {item.label}
                  </td>
                  <td className="py-3 text-right align-top whitespace-nowrap text-neutral-800 tabular-nums">
                    {formatLKR(item.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-neutral-200">
                <td className="py-3.5 align-top">
                  <p className="text-neutral-800">
                    {ticket.solution || ticket.issueTitle}
                  </p>
                  {ticket.partsUsed ? (
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Parts: {ticket.partsUsed}
                    </p>
                  ) : null}
                </td>
                <td className="py-3.5 text-right align-top whitespace-nowrap text-neutral-800 tabular-nums">
                  {formatLKR(subtotal)}
                </td>
              </tr>
            )}
            {showSubtotal ? (
              <tr>
                <td className="pt-3 text-right text-neutral-500">Subtotal</td>
                <td className="pt-3 text-right whitespace-nowrap text-neutral-600 tabular-nums">
                  {formatLKR(subtotal)}
                </td>
              </tr>
            ) : null}
            {discountAmount > 0 ? (
              <tr>
                <td className="py-1.5 text-right text-neutral-500">
                  {discountLabel}
                </td>
                <td className="py-1.5 text-right whitespace-nowrap text-neutral-600 tabular-nums">
                  −{formatLKR(discountAmount)}
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-800">
              <td className="pt-3 text-right text-sm font-semibold tracking-widest text-neutral-500 uppercase">
                Total
              </td>
              <td className="pt-3 text-right text-2xl font-bold whitespace-nowrap text-neutral-900 tabular-nums">
                {formatLKR(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Paid seal / balance due ───────────────────────── */}
        {isSettled ? (
          <div className="mt-8 flex justify-center break-inside-avoid">
            <div className="rounded-md border-[3px] border-green-700/70 px-10 py-3 text-center">
              <p className="text-5xl leading-none font-black tracking-[0.15em] text-green-700/85 uppercase">
                Paid
              </p>
              {paidMeta ? (
                <p className="mt-1.5 text-[9px] leading-tight font-medium tracking-[0.2em] text-green-800/70 uppercase">
                  {paidMeta}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex items-center justify-between border border-neutral-300 bg-neutral-50 px-4 py-3">
            <p className="text-sm font-semibold tracking-wide text-neutral-700 uppercase">
              Balance due
            </p>
            <p className="text-lg font-bold text-neutral-900 tabular-nums">
              {formatLKR(total)}
            </p>
          </div>
        )}

        {/* ── How to pay ────────────────────────────────────── */}
        {!isSettled && show.payment && total > 0 ? (
          <div className="mt-6 break-inside-avoid border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              How to pay
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Transfer to the account below and keep your receipt, or pay in
              store. Quote{" "}
              <span className="font-semibold text-neutral-900">
                {ticket.ticketNumber}
              </span>{" "}
              as the reference.
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <span className="text-neutral-400">Bank:</span>
                <span className="font-semibold text-neutral-800">
                  {payTo.bankName}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-400">Branch:</span>
                <span className="font-semibold text-neutral-800">
                  {payTo.branch}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-400">Account name:</span>
                <span className="font-semibold text-neutral-800">
                  {payTo.accountName}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-neutral-400">Account no:</span>
                <span className="font-semibold text-neutral-800 tabular-nums">
                  {payTo.accountNumber}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Specific warranty (when a period is set) ──────── */}
        {showWarranty ? (
          <div className="mt-6 break-inside-avoid border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              Warranty
            </p>
            <p className="mt-2 text-sm text-neutral-700">
              <span className="font-semibold">{ticket.warrantyPeriod}</span>{" "}
              warranty
              {ticket.warrantyParts ? <> on {ticket.warrantyParts}</> : null}.
            </p>
            {warrantyEnd ? (
              <p className="mt-1 text-sm text-neutral-700">
                Valid until{" "}
                <span className="font-semibold">
                  {formatDate(warrantyEnd)}, 11:59 PM
                </span>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ── Notes ─────────────────────────────────────────── */}
        {show.notes && ticket.billNotes ? (
          <div className="mt-6 break-inside-avoid border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[11px] font-semibold tracking-widest text-neutral-400 uppercase">
              Notes
            </p>
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
              {ticket.billNotes}
            </p>
          </div>
        ) : null}

        {/* ── Scan to track ─────────────────────────────────── */}
        {show.track && trackQr ? (
          <div className="mt-6 flex items-center gap-4 break-inside-avoid border border-neutral-200 bg-neutral-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- static data URL */}
            <img
              src={trackQr}
              alt={`QR code to track repair ${ticket.ticketNumber}`}
              className="size-20 shrink-0 rounded-sm border border-neutral-200 bg-white p-1"
            />
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                Track this repair anytime
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Scan the code or enter ticket {ticket.ticketNumber} on our
                online tracker — live status, no sign-in needed.
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="mt-9 border-t-2 border-neutral-800 pt-5">
          <p className="text-center text-sm text-neutral-700 italic">
            “{BILL_QUOTE}”
          </p>
          <p className="mt-4 text-[10.5px] leading-relaxed text-neutral-400">
            <span className="font-semibold text-neutral-500 uppercase">
              Warranty terms:{" "}
            </span>
            {WARRANTY_TERMS}
          </p>
          <p className="mt-4 text-center text-[11px] tracking-wide text-neutral-400">
            {SHOP.name} · {SHOP.phone} · {SHOP.email}
          </p>
        </div>
      </div>
    </div>
  );
}
