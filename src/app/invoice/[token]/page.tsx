import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { computeBill, invoiceNumber } from "@/lib/bill";
import { fetchBillByToken } from "@/lib/bill-data";
import { limitByIp } from "@/lib/rate-limit";
import { getShopInfo, getShopPayTo, shopWhatsappLink } from "@/lib/settings";
import { statusLabel } from "@/lib/status";
import { trackQrDataUrl } from "@/lib/track-qr";
import { formatDate, formatLKR } from "@/lib/utils";
import { BillDocument } from "@/components/bill-document";
import { Button } from "@/components/ui/button";
import { AutoPrint } from "@/components/bill-print-button";
import { CopyButton, PdfButton } from "./invoice-buttons";

// The customer's bill link, as in docs/design-samples/bill.html (section 3).
// Like a Stripe invoice link it needs no sign-in: the token in the address is
// the repair's unguessable tracking token, so only someone the shop sent the
// link to (or who holds the printed QR) can open it. That is why it can show
// prices and the customer's name, which the public tracker never does. Keep it
// out of search engines and out of the Referer header.
export const metadata: Metadata = {
  title: "Your bill",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const throttle = await limitByIp("track");
  if (!throttle.ok) notFound();

  const result = await fetchBillByToken(token);
  if (!result) notFound();

  const [shop, shopPayTo, trackQr, session] = await Promise.all([
    getShopInfo(),
    getShopPayTo(),
    trackQrDataUrl(result.trackToken),
    auth(),
  ]);
  const ticket = result.bill;
  const bill = computeBill(ticket, shopPayTo);
  const number = invoiceNumber(ticket.ticketNumber);
  const pdfHref = `/invoice/${encodeURIComponent(token)}/pdf`;
  const hasPrice = bill.total > 0;
  const isOwner = !!session?.user && session.user.id === result.customerId;
  const firstName = bill.owner.trim().split(/\s+/)[0];

  const questionHref = shopWhatsappLink(
    shop,
    `Hi ${shop.name}, I have a question about my bill ${number} (${bill.deviceName}).`,
  );
  const slipHref = shopWhatsappLink(
    shop,
    `Hi ${shop.name}, here is my payment slip for bill ${number}: LKR ${bill.balance.toLocaleString("en-LK")}.`,
  );
  const showPay = !bill.isSettled && hasPrice && bill.show.payment && bill.balance > 0;
  const lines = bill.isItemized
    ? bill.items
    : [{ label: ticket.solution || ticket.issueTitle, qty: 1, unitPrice: bill.subtotal, amount: bill.subtotal }];

  return (
    <div className="min-h-dvh bg-background print:bg-white">
      <style>{`@media print { @page { size: A4; margin: 12mm; } html, body { background: #fff !important; } }`}</style>
      <Suspense>
        <AutoPrint />
      </Suspense>

      {/* ── The printable A4 bill: only shown when printing ──── */}
      <div className="hidden print:block">
        <BillDocument ticket={ticket} shop={shop} shopPayTo={shopPayTo} trackQr={trackQr} />
      </div>

      <main className="mx-auto flex max-w-md flex-col gap-3 px-4 pt-4 pb-12 print:hidden">
        {/* Shop */}
        <header className="flex items-center gap-3 py-2">
          {shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- shop logo from Settings
            <img src={shop.logoUrl} alt="" className="size-11 rounded-xl object-cover" />
          ) : (
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-ink text-lg font-extrabold text-ink-foreground">
              {shop.logoEmoji || shop.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-extrabold">{shop.name}</p>
            <p className="text-sm text-muted-foreground">
              {bill.isSettled ? "Receipt" : "Invoice"} {number} · {formatDate(bill.billDate)}
            </p>
          </div>
        </header>

        {/* What they owe, or that it's paid */}
        {!hasPrice ? (
          <section className="rounded-[24px] bg-card p-5">
            <h1 className="text-xl font-extrabold">Your bill isn&apos;t ready yet</h1>
            <p className="mt-1 text-muted-foreground">
              We&apos;ll send it as soon as we know the price for your {bill.deviceName}.
            </p>
            <Button asChild variant="secondary" size="lg" className="mt-4 w-full">
              <Link href={`/track/${encodeURIComponent(result.trackToken)}`}>See your repair</Link>
            </Button>
          </section>
        ) : bill.isSettled ? (
          <section className="flex flex-col gap-3 rounded-[24px] bg-success p-5 text-white">
            <p className="text-sm font-bold opacity-90">✓ Paid in full</p>
            <h1 className="text-4xl leading-none font-extrabold tracking-tight tabular-nums">
              {formatLKR(bill.total)}
            </h1>
            <p className="text-sm opacity-90">
              Thank you{firstName ? `, ${firstName}` : ""}.{" "}
              {bill.payments.length > 0
                ? `Paid ${bill.payments.map((p) => `${formatLKR(p.amount)} by ${p.method.toLowerCase()} on ${formatDate(p.at)}`).join(", ")}.`
                : ""}
            </p>
            <PdfButton href={pdfHref} label="Download receipt" variant="white" />
          </section>
        ) : (
          <section className="flex flex-col gap-3 rounded-[24px] bg-ink p-5 text-ink-foreground">
            <p className="text-sm font-bold opacity-80">Balance due</p>
            <h1 className="text-4xl leading-none font-extrabold tracking-tight tabular-nums">
              {formatLKR(bill.balance)}
            </h1>
            <p className="text-sm opacity-85">
              {bill.paidTotal > 0
                ? `Total ${formatLKR(bill.total)}. You've paid ${formatLKR(bill.paidTotal)}. `
                : ""}
              Pay when you collect, or by bank transfer.
            </p>
            <div className="flex gap-2">
              {showPay ? (
                <Button asChild size="lg" className="flex-1 bg-white text-neutral-900 hover:bg-white/90">
                  <a href="#pay">Pay by bank transfer</a>
                </Button>
              ) : null}
              <PdfButton href={pdfHref} label={showPay ? "PDF" : "Download PDF"} className={showPay ? "" : "flex-1"} />
            </div>
          </section>
        )}

        {/* Warranty, once paid */}
        {bill.isSettled && bill.warrantyItems.length > 0 ? (
          <section className="rounded-[24px] bg-card p-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="font-bold">Your warranty</p>
                <p className="text-sm text-muted-foreground">Keep this link to claim it.</p>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {bill.warrantyItems.map((item, i) => (
                <li key={`${item.label}-${i}`} className="py-2.5 text-sm">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-muted-foreground">
                    {item.warranty}
                    {item.cover ? `, ${item.cover.toLowerCase()}` : ""}
                    {item.warrantyEnd ? ` · until ${formatDate(item.warrantyEnd)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Not covered: water or physical damage, or repair by anyone else.
            </p>
          </section>
        ) : bill.isSettled && bill.warrantyEnd && ticket.warrantyPeriod ? (
          <section className="flex items-center gap-3 rounded-[24px] bg-card p-5">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-bold">{ticket.warrantyPeriod} warranty</p>
              <p className="text-sm text-muted-foreground">
                {ticket.warrantyParts ? `Covers ${ticket.warrantyParts} until` : "Valid until"}{" "}
                {formatDate(bill.warrantyEnd)}. Keep this link.
              </p>
            </div>
          </section>
        ) : null}

        {/* Items */}
        {hasPrice ? (
          <section className="rounded-[24px] bg-card p-5">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">{bill.deviceName}</h2>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                {statusLabel(ticket.status)}
              </span>
            </div>
            <ul>
              {lines.map((line, i) => (
                <li key={i} className="flex justify-between gap-3 border-t border-border py-2.5 first:border-t-0">
                  <span className="font-semibold">
                    {line.label}
                    {line.qty > 1 ? (
                      <span className="block text-sm font-normal text-muted-foreground">
                        {line.qty} × {formatLKR(line.unitPrice)}
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">{formatLKR(line.amount)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-2 border-t border-border pt-3">
              {bill.discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>{bill.discountLabel}</dt>
                  <dd className="tabular-nums">− {formatLKR(bill.discountAmount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between font-extrabold">
                <dt>{bill.isSettled ? "Total paid" : "Total"}</dt>
                <dd className="tabular-nums">{formatLKR(bill.total)}</dd>
              </div>
              {!bill.isSettled
                ? bill.payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-muted-foreground">
                      <dt>
                        Paid {formatDate(p.at)} · {p.method.toLowerCase()}
                      </dt>
                      <dd className="tabular-nums">{formatLKR(p.amount)}</dd>
                    </div>
                  ))
                : null}
            </dl>
          </section>
        ) : null}

        {/* Pay by bank transfer */}
        {showPay ? (
          <section id="pay" className="scroll-mt-4 rounded-[24px] bg-card p-5">
            <h2 className="mb-2 text-lg font-extrabold">Pay by bank transfer</h2>
            <dl>
              {(
                [
                  ["Bank", [bill.payTo.bankName, bill.payTo.branch].filter(Boolean).join(" · "), null],
                  ["Account name", bill.payTo.accountName, "account name"],
                  ["Account number", bill.payTo.accountNumber, "account number"],
                  ["Amount", bill.balance.toFixed(2), "amount"],
                  ["Reference", number, "reference"],
                ] as const
              ).map(([label, value, copyLabel]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0">
                  <div className="min-w-0">
                    <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
                    <dd className="font-bold break-words tabular-nums">{value}</dd>
                  </div>
                  {copyLabel && value ? <CopyButton value={value} label={copyLabel} /> : null}
                </div>
              ))}
            </dl>
            <p className="mt-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
              Put <b>{number}</b> as the reference so we can match your payment.
            </p>
            {isOwner ? (
              <Button asChild size="lg" className="mt-3 w-full">
                <Link href={`/repairs/${ticket.id}`}>Upload payment slip</Link>
              </Button>
            ) : slipHref ? (
              <Button asChild size="lg" className="mt-3 w-full">
                <a href={slipHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> Send your slip on WhatsApp
                </a>
              </Button>
            ) : null}
          </section>
        ) : null}

        {/* Questions */}
        <section className="flex flex-col gap-2 rounded-[24px] bg-card p-5">
          <h2 className="text-lg font-extrabold">Questions about this bill?</h2>
          {questionHref ? (
            <Button asChild variant="secondary" size="lg">
              <a href={questionHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> WhatsApp us
              </a>
            </Button>
          ) : null}
          <Button asChild variant="secondary" size="lg">
            <Link href={`/track/${encodeURIComponent(result.trackToken)}`}>See your repair</Link>
          </Button>
        </section>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          {[shop.name, shop.address, shop.phone].filter(Boolean).join(" · ")}
        </p>
      </main>
    </div>
  );
}
