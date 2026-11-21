import { billQuote, WARRANTY_TERMS } from "@/lib/config";
import {
  computeBill,
  invoiceNumber,
  type BillPayTo,
  type BillTicket,
} from "@/lib/bill";
import { statusLabel } from "@/lib/status";
import { formatDate, formatPhoneIntl, formatTime } from "@/lib/utils";

export type { BillTicket };

// The letterhead. Passed in rather than imported from config because the bill
// builder renders a live preview of this component on the client, where the
// database is unreachable, and because the shop's real name lives in
// Settings, not in a build-time env var.
export type BillShopInfo = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  /** Settings > Repairs. Falls back to the build-time default. */
  warrantyDays?: number;
  /** Settings > Bills and payments: the thank-you line. */
  billMessage?: string;
};

/** "4,500.00": the bill's money format, with the currency in the headings. */
function money(n: number) {
  return n.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const LABEL = "text-[11px] font-bold tracking-[0.08em] text-neutral-500 uppercase";

// The printable bill, as in docs/design-samples/bill.html (section 4): a
// white A4 sheet with the shop and "Invoice" (or "Receipt" once paid) at the
// top, who / what / when underneath, a table of items with quantity and
// price, the totals with every payment and the balance due, then how to pay
// and the QR code. Looks the same whatever the site theme.
export function BillDocument({
  ticket,
  shop,
  shopPayTo,
  trackQr,
}: {
  ticket: BillTicket;
  shop: BillShopInfo;
  /** Settings > Bank accounts default, used only when the bill saved none. */
  shopPayTo?: BillPayTo;
  trackQr?: string;
}) {
  const bill = computeBill(ticket, shopPayTo);
  const { show } = bill;
  const number = invoiceNumber(ticket.ticketNumber);

  const showTechnician = show.technician && !!bill.technician;
  const showIssue = show.issue && !!ticket.issueTitle;
  const showSolution = show.solution && !!ticket.solution;
  // Bills from before per-item warranties carry one for the whole repair.
  const showWarranty =
    bill.warrantyItems.length === 0 && show.warranty && !!ticket.warrantyPeriod;
  // Only issues the customer was actually told about belong on the bill.
  const billIssues = ticket.issues.filter((i) => i.note.trim().length > 0);
  const showRepairIssue = show.repairIssue && billIssues.length > 0;
  const phone = ticket.customerPhone || ticket.customer?.phone || null;
  const showPayBlock = !bill.isSettled && show.payment && bill.balance > 0;

  const lines = bill.isItemized
    ? bill.items
    : [
        {
          label: ticket.solution || ticket.issueTitle,
          qty: 1,
          unitPrice: bill.subtotal,
          amount: bill.subtotal,
          warranty: null as string | null,
          cover: null as string | null,
          warrantyEnd: null as Date | null,
        },
      ];

  return (
    <div className="@container relative mx-auto max-w-3xl overflow-hidden rounded-sm bg-white font-sans text-[13px] text-neutral-900 shadow-xl print:rounded-none print:shadow-none">
      <div className="px-6 py-8 @lg:px-12 @lg:py-12">
        {/* ── Shop and title ────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-lg font-extrabold text-white"
            >
              {shop.name.trim().charAt(0).toUpperCase() || "M"}
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold">{shop.name}</p>
              <p className="text-neutral-500">
                {[shop.address, shop.phone].filter(Boolean).join(" · ")}
              </p>
              {shop.email ? <p className="text-neutral-500">{shop.email}</p> : null}
            </div>
          </div>
          <div className="@lg:text-right">
            <p className="text-[28px] leading-none font-extrabold tracking-tight">
              {bill.isSettled ? "Receipt" : "Invoice"}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-neutral-500 tabular-nums @lg:justify-end">
              {number}
              {bill.isSettled ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                  Paid
                </span>
              ) : bill.state === "partial" ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  Part paid
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {/* ── Receipt summary, once fully paid ─────────────── */}
        {bill.isSettled ? (
          <div className="mt-8 break-inside-avoid border-y border-neutral-200 py-4">
            <p className="text-xl font-extrabold tracking-tight tabular-nums">
              LKR {money(bill.paidTotal)} paid
              {bill.paidDate ? ` on ${formatDate(bill.paidDate)}` : ""}
            </p>
            <p className="mt-0.5 text-neutral-500">
              {bill.payments.length > 1
                ? `In ${bill.payments.length} payments: ${[...new Set(bill.payments.map((p) => p.method))].join(", ")}`
                : bill.payments[0]
                  ? `Paid by ${bill.payments[0].method.toLowerCase()}`
                  : null}
            </p>
          </div>
        ) : null}

        {/* ── Who, what, when ───────────────────────────────── */}
        <div className="mt-8 mb-6 grid gap-6 @lg:grid-cols-3">
          <div>
            <p className={LABEL}>Bill to</p>
            <p className="mt-1 font-bold">{bill.owner}</p>
            {phone ? <p className="text-neutral-600">{formatPhoneIntl(phone)}</p> : null}
            {ticket.customer?.email ? (
              <p className="break-all text-neutral-600">{ticket.customer.email}</p>
            ) : null}
          </div>
          {show.device || show.status ? (
            <div>
              <p className={LABEL}>Device</p>
              {show.device ? <p className="mt-1 font-bold">{bill.deviceName}</p> : null}
              <p className="text-neutral-600">Repair {ticket.ticketNumber}</p>
              {show.status ? (
                <p className="text-neutral-600">{statusLabel(ticket.status)}</p>
              ) : null}
            </div>
          ) : (
            <div />
          )}
          <div>
            <p className={LABEL}>Dates</p>
            <p className="mt-1">
              Issued {formatDate(bill.billDate)}, {formatTime(bill.billDate)}
            </p>
            {bill.paidDate ? <p>Paid {formatDate(bill.paidDate)}</p> : null}
            {showTechnician ? <p className="text-neutral-600">Served by {bill.technician}</p> : null}
          </div>
        </div>

        {/* ── What was wrong / what we did ──────────────────── */}
        {showIssue || showSolution ? (
          <div className="mb-6 grid gap-5 rounded-lg bg-neutral-50 p-4 @lg:grid-cols-2">
            {showIssue ? (
              <div>
                <p className={LABEL}>Reported problem</p>
                <p className="mt-1 leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {ticket.issueTitle}
                </p>
              </div>
            ) : null}
            {showSolution ? (
              <div>
                <p className={LABEL}>Work done</p>
                <p className="mt-1 leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {ticket.solution}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Items ─────────────────────────────────────────── */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[1.5px] border-neutral-900 text-left">
              <th className={`${LABEL} py-2 font-bold`}>Item</th>
              <th className={`${LABEL} w-12 py-2 text-right font-bold`}>Qty</th>
              <th className={`${LABEL} hidden w-28 py-2 text-right font-bold @lg:table-cell`}>
                Price
              </th>
              <th className={`${LABEL} w-28 py-2 text-right font-bold`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={`${line.label}-${i}`} className="border-b border-neutral-200 align-top">
                <td className="py-2.5 pr-3">
                  {line.label}
                  {!bill.isItemized && ticket.partsUsed ? (
                    <span className="block text-xs text-neutral-500">
                      Parts: {ticket.partsUsed}
                    </span>
                  ) : null}
                  {line.warranty ? (
                    <span className="mt-0.5 block text-xs text-neutral-600">
                      {line.warranty} warranty
                      {line.cover ? ` · ${line.cover.toLowerCase()}` : ""}
                      {line.warrantyEnd ? ` · until ${formatDate(line.warrantyEnd)}` : ""}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 text-right tabular-nums">{line.qty}</td>
                <td className="hidden py-2.5 text-right tabular-nums @lg:table-cell">
                  {money(line.unitPrice)}
                </td>
                <td className="py-2.5 text-right tabular-nums">{money(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals, payments, balance ─────────────────────── */}
        <div className="mt-4 ml-auto flex w-full max-w-xs flex-col gap-1.5 break-inside-avoid">
          {bill.discountAmount > 0 ? (
            <>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{bill.discountLabel}</span>
                <span className="tabular-nums">− {money(bill.discountAmount)}</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between border-t-[1.5px] border-neutral-900 pt-2 text-base font-extrabold">
            <span>Total (LKR)</span>
            <span className="tabular-nums">{money(bill.total)}</span>
          </div>
          {bill.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-neutral-600">
              <span>
                Paid {formatDate(p.at)} · {p.method}
              </span>
              <span className="tabular-nums">− {money(p.amount)}</span>
            </div>
          ))}
          {bill.isSettled ? (
            <div className="mt-1 flex justify-between border-t border-neutral-200 pt-2 text-[15px] font-extrabold text-green-800">
              <span>Balance</span>
              <span className="tabular-nums">LKR {money(0)}</span>
            </div>
          ) : (
            <div className="mt-1 flex justify-between rounded bg-neutral-900 px-2.5 py-2 text-[15px] font-extrabold text-white">
              <span>Balance due</span>
              <span className="tabular-nums">LKR {money(bill.balance)}</span>
            </div>
          )}
        </div>

        {/* ── Issue during the repair (free-of-charge work) ─── */}
        {showRepairIssue ? (
          <div className="mt-6 break-inside-avoid rounded-lg border-l-[3px] border-neutral-900 bg-neutral-50 p-4">
            <p className={LABEL}>Issue during the repair</p>
            <div className="mt-2 space-y-3">
              {billIssues.map((issue, i) => (
                <div key={i}>
                  <p className="leading-relaxed whitespace-pre-wrap text-neutral-700">
                    <b className="text-neutral-900">What happened: </b>
                    {issue.note}
                  </p>
                  {issue.solution ? (
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap text-neutral-700">
                      <b className="text-neutral-900">Put right at no charge: </b>
                      {issue.solution}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-neutral-500">
                    {issue.status === "ACCEPTED"
                      ? "The customer agreed to the free fix."
                      : issue.status === "DECLINED"
                        ? "The customer chose not to continue, and a refund was agreed."
                        : "Waiting for the customer's decision."}
                  </p>
                </div>
              ))}
            </div>
            {ticket.issueWarranty ? (
              <p className="mt-3 text-neutral-700">
                <b className="text-neutral-900">Warranty on this work: </b>
                {ticket.issueWarranty}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-neutral-500">
              None of this is charged on this bill. We covered the parts and labour.
            </p>
          </div>
        ) : null}

        {/* ── Warranty ──────────────────────────────────────── */}
        {showWarranty ? (
          <div className="mt-6 break-inside-avoid rounded-lg bg-neutral-50 p-4">
            <p className={LABEL}>Warranty</p>
            <p className="mt-1 text-neutral-700">
              <b className="text-neutral-900">{ticket.warrantyPeriod}</b> warranty
              {ticket.warrantyParts ? <> on {ticket.warrantyParts}</> : null}
              {bill.warrantyEnd ? <>, valid until {formatDate(bill.warrantyEnd)}</> : null}.
            </p>
          </div>
        ) : null}

        {/* ── Notes ─────────────────────────────────────────── */}
        {show.notes && ticket.billNotes ? (
          <div className="mt-6 break-inside-avoid rounded-lg bg-neutral-50 p-4">
            <p className={LABEL}>Notes</p>
            <p className="mt-1 leading-relaxed whitespace-pre-wrap text-neutral-700">
              {ticket.billNotes}
            </p>
          </div>
        ) : null}

        {/* ── How to pay + QR ───────────────────────────────── */}
        {showPayBlock || (show.track && trackQr) ? (
          <div className="mt-7 flex flex-col gap-6 border-t border-neutral-200 pt-5 break-inside-avoid @lg:flex-row @lg:items-start">
            <div className="flex-1">
              {showPayBlock ? (
                <>
                  <p className="font-bold">How to pay</p>
                  <p className="mt-1 leading-relaxed text-neutral-700">
                    {bill.payTo.bankName}
                    {bill.payTo.branch ? `, ${bill.payTo.branch}` : ""} ·{" "}
                    {bill.payTo.accountName} ·{" "}
                    <span className="tabular-nums">{bill.payTo.accountNumber}</span>
                    <br />
                    Reference: <b>{number}</b>. Or pay at the shop when you collect.
                  </p>
                </>
              ) : (
                <p className="font-bold">Thank you.</p>
              )}
            </div>
            {show.track && trackQr ? (
              <div className="flex items-center gap-3 @lg:flex-col @lg:text-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- static data URL */}
                <img
                  src={trackQr}
                  alt={`QR code to open repair ${ticket.ticketNumber}`}
                  className="size-20 shrink-0 rounded bg-white"
                />
                <p className="max-w-[9rem] text-[11px] text-neutral-500">
                  Scan to see this repair and bill
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="mt-8 border-t border-neutral-200 pt-4 text-neutral-500">
          <p className="text-neutral-700">
            {shop.billMessage?.trim() || billQuote(shop.name)}
          </p>
          <div className="mt-3 text-[11px] leading-relaxed">
            <p className="font-bold text-neutral-600">Warranty terms</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {WARRANTY_TERMS.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
