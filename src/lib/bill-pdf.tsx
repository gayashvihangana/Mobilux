import "server-only";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { billQuote, WARRANTY_TERMS } from "@/lib/config";
import { computeBill, invoiceNumber, type BillPayTo, type BillTicket } from "@/lib/bill";
import { statusLabel } from "@/lib/status";
import { formatDate, formatPhoneIntl, formatTime } from "@/lib/utils";
import type { BillShopInfo } from "@/components/bill-document";

// The bill as a real PDF file, for the Download buttons: sharp text, a small
// file, and no print dialog. It follows the same layout as BillDocument (the
// on-screen and printed bill), section by section, from the same computeBill
// figures. A change to one should be made to the other.

const C = {
  ink: "#171717",
  text: "#404040",
  muted: "#737373",
  line: "#e5e5e5",
  soft: "#fafafa",
  green: "#166534",
  greenSoft: "#dcfce7",
  amber: "#78350f",
  amberSoft: "#fef3c7",
};

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9.5, color: C.ink, lineHeight: 1.4 },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: C.muted },
  text: { color: C.text },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 0.6,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.ink,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    textAlign: "center",
    paddingTop: 8,
    marginRight: 9,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, lineHeight: 1.15, textAlign: "right" },
  pill: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1.5, fontFamily: "Helvetica-Bold", fontSize: 7.5, marginLeft: 6 },
  box: { backgroundColor: C.soft, borderRadius: 6, padding: 11, marginBottom: 14 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 0.6, color: C.muted, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: C.line, paddingVertical: 6 },
  cItem: { flex: 1, paddingRight: 8 },
  cQty: { width: 34, textAlign: "right" },
  cMoney: { width: 72, textAlign: "right" },
  small: { fontSize: 8, color: C.text, marginTop: 1.5 },
});

function money(n: number) {
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BillPdf({
  ticket,
  shop,
  shopPayTo,
  trackQr,
}: {
  ticket: BillTicket;
  shop: BillShopInfo;
  shopPayTo?: BillPayTo;
  trackQr?: string;
}) {
  const bill = computeBill(ticket, shopPayTo);
  const { show } = bill;
  const number = invoiceNumber(ticket.ticketNumber);
  const phone = ticket.customerPhone || ticket.customer?.phone || null;
  const showTechnician = show.technician && !!bill.technician;
  const showIssue = show.issue && !!ticket.issueTitle;
  const showSolution = show.solution && !!ticket.solution;
  const showWarranty =
    bill.warrantyItems.length === 0 && show.warranty && !!ticket.warrantyPeriod;
  const billIssues = ticket.issues.filter((i) => i.note.trim().length > 0);
  const showRepairIssue = show.repairIssue && billIssues.length > 0;
  const showPayBlock = !bill.isSettled && show.payment && bill.balance > 0;
  const showQr = show.track && !!trackQr;

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
    <Document
      title={`${bill.isSettled ? "Receipt" : "Invoice"} ${number}`}
      author={shop.name}
      subject={`${bill.deviceName} repair ${ticket.ticketNumber}`}
    >
      <Page size="A4" style={s.page}>
        {/* Shop and title */}
        <View style={s.between}>
          <View style={[s.row, { alignItems: "center", flex: 1, paddingRight: 12 }]}>
            <Text style={s.logo}>{shop.name.trim().charAt(0).toUpperCase() || "M"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.bold, { fontSize: 11.5 }]}>{shop.name}</Text>
              <Text style={s.muted}>{[shop.address, shop.phone].filter(Boolean).join(" · ")}</Text>
              {shop.email ? <Text style={s.muted}>{shop.email}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={s.title}>{bill.isSettled ? "Receipt" : "Invoice"}</Text>
            <View style={[s.row, { justifyContent: "flex-end", alignItems: "center", marginTop: 5 }]}>
              <Text style={s.muted}>{number}</Text>
              {bill.isSettled ? (
                <Text style={[s.pill, { backgroundColor: C.greenSoft, color: C.green }]}>Paid</Text>
              ) : bill.state === "partial" ? (
                <Text style={[s.pill, { backgroundColor: C.amberSoft, color: C.amber }]}>Part paid</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Receipt summary */}
        {bill.isSettled ? (
          <View style={{ marginTop: 20, paddingVertical: 10, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: C.line }}>
            <Text style={[s.bold, { fontSize: 14 }]}>
              LKR {money(bill.paidTotal)} paid
              {bill.paidDate ? ` on ${formatDate(bill.paidDate)}` : ""}
            </Text>
            <Text style={[s.muted, { marginTop: 2 }]}>
              {bill.payments.length > 1
                ? `In ${bill.payments.length} payments: ${[...new Set(bill.payments.map((p) => p.method))].join(", ")}`
                : bill.payments[0]
                  ? `Paid by ${bill.payments[0].method.toLowerCase()}`
                  : ""}
            </Text>
          </View>
        ) : null}

        {/* Who, what, when */}
        <View style={[s.row, { marginTop: 20, marginBottom: 14 }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.bold}>{bill.owner}</Text>
            {phone ? <Text style={s.text}>{formatPhoneIntl(phone)}</Text> : null}
            {ticket.customer?.email ? <Text style={s.text}>{ticket.customer.email}</Text> : null}
          </View>
          <View style={{ flex: 1, paddingRight: 10 }}>
            {show.device || show.status ? (
              <>
                <Text style={s.label}>Device</Text>
                {show.device ? <Text style={s.bold}>{bill.deviceName}</Text> : null}
                <Text style={s.text}>Repair {ticket.ticketNumber}</Text>
                {show.status ? <Text style={s.text}>{statusLabel(ticket.status)}</Text> : null}
              </>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Dates</Text>
            <Text>
              Issued {formatDate(bill.billDate)}, {formatTime(bill.billDate)}
            </Text>
            {bill.paidDate ? <Text>Paid {formatDate(bill.paidDate)}</Text> : null}
            {showTechnician ? <Text style={s.text}>Served by {bill.technician}</Text> : null}
          </View>
        </View>

        {/* What was wrong / what we did */}
        {showIssue || showSolution ? (
          <View style={[s.box, s.row]}>
            {showIssue ? (
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.label}>Reported problem</Text>
                <Text style={s.text}>{ticket.issueTitle}</Text>
              </View>
            ) : null}
            {showSolution ? (
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Work done</Text>
                <Text style={s.text}>{ticket.solution}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Items */}
        <View style={[s.row, { borderBottomWidth: 1.25, borderBottomColor: C.ink, paddingBottom: 5 }]}>
          <Text style={[s.th, s.cItem]}>Item</Text>
          <Text style={[s.th, s.cQty]}>Qty</Text>
          <Text style={[s.th, s.cMoney]}>Price</Text>
          <Text style={[s.th, s.cMoney]}>Total</Text>
        </View>
        {lines.map((line, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <View style={s.cItem}>
              <Text>{line.label}</Text>
              {!bill.isItemized && ticket.partsUsed ? (
                <Text style={[s.small, s.muted]}>Parts: {ticket.partsUsed}</Text>
              ) : null}
              {line.warranty ? (
                <Text style={s.small}>
                  {line.warranty} warranty
                  {line.cover ? ` · ${line.cover.toLowerCase()}` : ""}
                  {line.warrantyEnd ? ` · until ${formatDate(line.warrantyEnd)}` : ""}
                </Text>
              ) : null}
            </View>
            <Text style={s.cQty}>{line.qty}</Text>
            <Text style={s.cMoney}>{money(line.unitPrice)}</Text>
            <Text style={s.cMoney}>{money(line.amount)}</Text>
          </View>
        ))}

        {/* Totals, payments, balance */}
        <View style={{ marginTop: 10, marginLeft: "auto", width: 230 }} wrap={false}>
          {bill.discountAmount > 0 ? (
            <>
              <View style={[s.between, { marginBottom: 3 }]}>
                <Text>Subtotal</Text>
                <Text>{money(bill.subtotal)}</Text>
              </View>
              <View style={[s.between, { marginBottom: 3 }]}>
                <Text>{bill.discountLabel}</Text>
                <Text>- {money(bill.discountAmount)}</Text>
              </View>
            </>
          ) : null}
          <View style={[s.between, { borderTopWidth: 1.25, borderTopColor: C.ink, paddingTop: 5, marginBottom: 3 }]}>
            <Text style={[s.bold, { fontSize: 11 }]}>Total (LKR)</Text>
            <Text style={[s.bold, { fontSize: 11 }]}>{money(bill.total)}</Text>
          </View>
          {bill.payments.map((p) => (
            <View key={p.id}>
              <View style={[s.between, { marginBottom: 3 }]}>
                <Text style={s.text}>
                  {p.change > 0 && p.method === "Cash" ? "Cash received" : "Paid"} {formatDate(p.at)}
                  {p.change > 0 && p.method === "Cash" ? "" : ` · ${p.method}`}
                </Text>
                <Text style={s.text}>{money(p.amount)}</Text>
              </View>
              {p.change > 0 ? (
                <View style={[s.between, { marginBottom: 3 }]}>
                  <Text style={s.text}>Change given</Text>
                  <Text style={s.text}>{money(p.change)}</Text>
                </View>
              ) : null}
            </View>
          ))}
          {bill.extraReceived > 0 ? (
            <View style={[s.between, { marginBottom: 3 }]}>
              <Text style={s.text}>Extra received</Text>
              <Text style={s.text}>{money(bill.extraReceived)}</Text>
            </View>
          ) : null}
          {bill.isSettled ? (
            <View style={[s.between, { borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 5, marginTop: 2 }]}>
              <Text style={[s.bold, { fontSize: 11, color: C.green }]}>Balance</Text>
              <Text style={[s.bold, { fontSize: 11, color: C.green }]}>LKR {money(0)}</Text>
            </View>
          ) : (
            <View style={[s.between, { backgroundColor: C.ink, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 5, marginTop: 2 }]}>
              <Text style={[s.bold, { fontSize: 11, color: "#ffffff" }]}>Balance due</Text>
              <Text style={[s.bold, { fontSize: 11, color: "#ffffff" }]}>LKR {money(bill.balance)}</Text>
            </View>
          )}
        </View>

        {/* Issue during the repair */}
        {showRepairIssue ? (
          <View style={[s.box, { marginTop: 16, borderLeftWidth: 2.5, borderLeftColor: C.ink }]} wrap={false}>
            <Text style={s.label}>Issue during the repair</Text>
            {billIssues.map((issue, i) => (
              <View key={i} style={{ marginTop: i ? 6 : 0 }}>
                <Text style={s.text}>
                  <Text style={[s.bold, { color: C.ink }]}>What happened: </Text>
                  {issue.note}
                </Text>
                {issue.solution ? (
                  <Text style={s.text}>
                    <Text style={[s.bold, { color: C.ink }]}>Put right at no charge: </Text>
                    {issue.solution}
                  </Text>
                ) : null}
                <Text style={[s.small, s.muted]}>
                  {issue.status === "ACCEPTED"
                    ? "The customer agreed to the free fix."
                    : issue.status === "DECLINED"
                      ? "The customer chose not to continue, and a refund was agreed."
                      : "Waiting for the customer's decision."}
                </Text>
              </View>
            ))}
            {ticket.issueWarranty ? (
              <Text style={[s.text, { marginTop: 6 }]}>
                <Text style={[s.bold, { color: C.ink }]}>Warranty on this work: </Text>
                {ticket.issueWarranty}
              </Text>
            ) : null}
            <Text style={[s.small, s.muted, { marginTop: 6 }]}>
              None of this is charged on this bill. We covered the parts and labour.
            </Text>
          </View>
        ) : null}

        {/* Warranty (bills from before per-item warranties) */}
        {showWarranty ? (
          <View style={[s.box, { marginTop: 16 }]} wrap={false}>
            <Text style={s.label}>Warranty</Text>
            <Text style={s.text}>
              <Text style={[s.bold, { color: C.ink }]}>{ticket.warrantyPeriod}</Text> warranty
              {ticket.warrantyParts ? ` on ${ticket.warrantyParts}` : ""}
              {bill.warrantyEnd ? `, valid until ${formatDate(bill.warrantyEnd)}` : ""}.
            </Text>
          </View>
        ) : null}

        {/* Notes */}
        {show.notes && ticket.billNotes ? (
          <View style={[s.box, { marginTop: 16 }]} wrap={false}>
            <Text style={s.label}>Notes</Text>
            <Text style={s.text}>{ticket.billNotes}</Text>
          </View>
        ) : null}

        {/* How to pay + QR */}
        {showPayBlock || showQr ? (
          <View style={[s.row, { marginTop: 18, paddingTop: 12, borderTopWidth: 0.75, borderTopColor: C.line }]} wrap={false}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              {showPayBlock ? (
                <>
                  <Text style={s.bold}>How to pay</Text>
                  <Text style={[s.text, { marginTop: 2 }]}>
                    {bill.payTo.bankName}
                    {bill.payTo.branch ? `, ${bill.payTo.branch}` : ""} · {bill.payTo.accountName} ·{" "}
                    {bill.payTo.accountNumber}
                  </Text>
                  <Text style={s.text}>
                    Reference: <Text style={[s.bold, { color: C.ink }]}>{number}</Text>. Or pay at the
                    shop when you collect.
                  </Text>
                </>
              ) : (
                <Text style={s.bold}>Thank you.</Text>
              )}
            </View>
            {showQr ? (
              <View style={{ alignItems: "center", width: 90 }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
                <Image src={trackQr!} style={{ width: 58, height: 58 }} />
                <Text style={[s.muted, { fontSize: 7, textAlign: "center", marginTop: 3 }]}>
                  Scan to see this repair and bill
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Footer */}
        <View style={{ marginTop: 20, paddingTop: 10, borderTopWidth: 0.75, borderTopColor: C.line }} wrap={false}>
          <Text style={s.text}>{shop.billMessage?.trim() || billQuote(shop.name)}</Text>
          <Text style={[s.bold, { fontSize: 7.5, color: C.text, marginTop: 8 }]}>Warranty terms</Text>
          {WARRANTY_TERMS.map((term) => (
            <View key={term} style={[s.row, { marginTop: 2 }]}>
              <Text style={{ fontSize: 7.5, color: C.muted, width: 8 }}>•</Text>
              <Text style={{ fontSize: 7.5, color: C.muted, flex: 1 }}>{term}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

/** The bill as PDF bytes, plus a filename like "Receipt INV-0015.pdf". */
export async function renderBillPdf(args: {
  ticket: BillTicket;
  shop: BillShopInfo;
  shopPayTo?: BillPayTo;
  trackQr?: string;
}): Promise<{ data: Buffer; filename: string }> {
  const bill = computeBill(args.ticket, args.shopPayTo);
  const data = await renderToBuffer(<BillPdf {...args} />);
  const filename = `${bill.isSettled ? "Receipt" : "Invoice"} ${invoiceNumber(args.ticket.ticketNumber)}.pdf`;
  return { data, filename };
}

/** A download response: saves the file instead of opening a page. */
export function pdfResponse({ data, filename }: { data: Buffer; filename: string }) {
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
