import * as React from "react";
import path from "path";
import {
  Document,
  Font,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { SHOP, BILL_QUOTE, WARRANTY_TERMS } from "@/lib/config";
import { trackQrDataUrl } from "@/lib/track-qr";
import { computeBill, invoiceNumber, type BillTicket } from "@/lib/bill";
import { doneLabel } from "@/lib/status";
import { formatDate, formatLKR, formatPhoneIntl, formatTime } from "@/lib/utils";

// Mirrors the on-screen BillDocument — classic serif invoice, no colour band.
const C = {
  ink: "#171717",
  ink900: "#111827",
  body: "#374151",
  gray500: "#6b7280",
  gray400: "#9ca3af",
  border: "#e5e7eb",
  borderDark: "#171717",
  panel: "#fafafa",
  panelBorder: "#e5e7eb",
  green: "#15803d",
};

// Newsreader — a warm editorial serif (the free stand-in for Claude's serif),
// registered from the bundled TTFs. Each variant is its own family name so the
// existing `fontFamily: SERIF_*` styles keep selecting the right file.
const fontsDir = path.join(process.cwd(), "public", "fonts");
const SERIF = "Newsreader";
const SERIF_BOLD = "Newsreader-Bold";
const SERIF_ITALIC = "Newsreader-Italic";

Font.register({
  family: SERIF,
  src: path.join(fontsDir, "newsreader-400-normal.ttf"),
});
Font.register({
  family: SERIF_BOLD,
  src: path.join(fontsDir, "newsreader-700-normal.ttf"),
});
Font.register({
  family: SERIF_ITALIC,
  src: path.join(fontsDir, "newsreader-400-italic.ttf"),
});
// Newsreader has no hyphenation dictionary; keep words intact like the web view.
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: {
    fontFamily: SERIF,
    fontSize: 10,
    color: C.body,
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 44,
    lineHeight: 1.4,
  },
  // Letterhead
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shopName: { fontSize: 26, fontFamily: SERIF_BOLD, color: C.ink900 },
  tagline: { fontSize: 10, fontFamily: SERIF_ITALIC, color: C.gray500, marginTop: 2 },
  shopContact: { fontSize: 8.5, color: C.gray500, marginTop: 8, lineHeight: 1.5 },
  invoiceWord: {
    fontSize: 15,
    fontFamily: SERIF_BOLD,
    color: C.ink900,
    letterSpacing: 4,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 7.5,
    color: C.gray400,
    textTransform: "uppercase",
    marginRight: 8,
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: SERIF_BOLD,
    color: C.ink,
    textAlign: "right",
    minWidth: 74,
  },
  ruleThick: { borderTopWidth: 2, borderTopColor: C.borderDark, marginVertical: 20 },
  // Parties
  partiesRow: { flexDirection: "row", justifyContent: "space-between" },
  sectionLabel: {
    fontSize: 7.5,
    color: C.gray400,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: SERIF_BOLD,
  },
  partyName: { fontFamily: SERIF_BOLD, fontSize: 12, marginTop: 4, color: C.ink900 },
  partyDetail: { color: C.gray500, marginTop: 2, fontSize: 9.5 },
  partySmall: { color: C.gray500, marginTop: 1, fontSize: 9 },
  // Device / status
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingVertical: 8,
    marginTop: 20,
  },
  metaInline: { flexDirection: "row" },
  faint: { color: C.gray400 },
  strong: { fontFamily: SERIF_BOLD, color: C.ink },
  // Details
  detailsRow: { flexDirection: "row", gap: 20, marginTop: 18 },
  detailCol: { flex: 1 },
  detailText: { marginTop: 4, color: C.body, lineHeight: 1.5, fontSize: 9.5 },
  // Table
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: C.borderDark,
    paddingBottom: 6,
    marginTop: 20,
  },
  th: {
    fontSize: 7.5,
    color: C.gray500,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: SERIF_BOLD,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 10,
  },
  lineTitle: { maxWidth: 380, color: C.ink },
  lineParts: { fontSize: 8.5, color: C.gray500, marginTop: 3 },
  amount: { color: C.ink },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    marginTop: 8,
    gap: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: C.borderDark,
    gap: 16,
  },
  totalLabel: {
    fontFamily: SERIF_BOLD,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.gray500,
  },
  totalValue: { fontFamily: SERIF_BOLD, fontSize: 18, color: C.ink900 },
  // Seal / due
  sealWrap: { marginTop: 24, alignItems: "center" },
  seal: {
    borderWidth: 2,
    borderColor: C.green,
    paddingHorizontal: 28,
    paddingVertical: 6,
    alignItems: "center",
  },
  sealText: {
    fontSize: 22,
    fontFamily: SERIF_BOLD,
    color: C.green,
    letterSpacing: 6,
  },
  sealMeta: {
    fontSize: 8,
    color: C.green,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 3,
  },
  dueBox: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    backgroundColor: C.panel,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dueLabel: {
    fontFamily: SERIF_BOLD,
    color: C.body,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dueValue: { fontFamily: SERIF_BOLD, color: C.ink900, fontSize: 14 },
  // Panels
  panel: {
    marginTop: 18,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.panelBorder,
    padding: 12,
  },
  payGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  payCol: { width: "50%", marginBottom: 8, flexDirection: "row" },
  notesText: { fontSize: 9.5, color: C.body, marginTop: 5, lineHeight: 1.5 },
  trackBox: {
    marginTop: 18,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.panelBorder,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  trackQr: { width: 64, height: 64 },
  // Footer
  footer: {
    marginTop: 26,
    borderTopWidth: 2,
    borderTopColor: C.borderDark,
    paddingTop: 14,
  },
  quote: {
    fontSize: 10.5,
    fontFamily: SERIF_ITALIC,
    color: C.body,
    textAlign: "center",
  },
  warrantyTerms: {
    fontSize: 7.5,
    color: C.gray400,
    marginTop: 12,
    lineHeight: 1.5,
    textAlign: "justify",
  },
  footerContact: {
    fontSize: 8,
    color: C.gray400,
    marginTop: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
});

function BillPdf({ ticket, trackQr }: { ticket: BillTicket; trackQr: string }) {
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
  const showDeviceBox = show.device || show.status;
  const showIssue = show.issue && !!ticket.issueTitle;
  const showSolution = show.solution && !!ticket.solution;
  const showWarranty = show.warranty && !!ticket.warrantyPeriod;
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
    <Document
      title={`${SHOP.name} invoice ${invoiceNumber(ticket.ticketNumber)}`}
      author={SHOP.name}
    >
      <Page size="A4" style={s.page}>
        {/* Letterhead */}
        <View style={s.letterhead}>
          <View>
            <Text style={s.shopName}>{SHOP.name}</Text>
            <Text style={s.tagline}>{SHOP.tagline}</Text>
            <Text style={s.shopContact}>
              {SHOP.city}
              {"\n"}
              {SHOP.phone} · {SHOP.email}
            </Text>
          </View>
          <View>
            <Text style={s.invoiceWord}>INVOICE</Text>
            {meta.map((m) => (
              <View key={m.label} style={s.metaRow}>
                <Text style={s.metaLabel}>{m.label}</Text>
                <Text style={s.metaValue}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.ruleThick} />

        {/* Parties */}
        <View style={s.partiesRow}>
          <View>
            <Text style={s.sectionLabel}>Bill to</Text>
            <Text style={s.partyName}>{owner}</Text>
            {phone ? (
              <Text style={s.partyDetail}>{formatPhoneIntl(phone)}</Text>
            ) : null}
            {ticket.customer?.email ? (
              <Text style={s.partyDetail}>{ticket.customer.email}</Text>
            ) : null}
          </View>
          {showTechnician ? (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.sectionLabel}>Served by</Text>
              <Text style={s.partyName}>{technician}</Text>
              <Text style={s.partySmall}>Technician</Text>
            </View>
          ) : null}
        </View>

        {/* Device / status */}
        {showDeviceBox ? (
          <View style={s.deviceRow}>
            {show.device ? (
              <View style={s.metaInline}>
                <Text style={s.faint}>Device:&nbsp;</Text>
                <Text style={s.strong}>{deviceName}</Text>
              </View>
            ) : (
              <Text> </Text>
            )}
            {show.status ? (
              <View style={s.metaInline}>
                <Text style={s.faint}>Status:&nbsp;</Text>
                <Text style={s.strong}>{doneLabel(ticket.status)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Repair details */}
        {showIssue || showSolution ? (
          <View style={s.detailsRow}>
            {showIssue ? (
              <View style={s.detailCol}>
                <Text style={s.sectionLabel}>Reported issue</Text>
                <Text style={s.detailText}>{ticket.issueTitle}</Text>
              </View>
            ) : null}
            {showSolution ? (
              <View style={s.detailCol}>
                <Text style={s.sectionLabel}>Work carried out</Text>
                <Text style={s.detailText}>{ticket.solution}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Line items */}
        <View style={s.tableHead}>
          <Text style={s.th}>Description</Text>
          <Text style={s.th}>Amount</Text>
        </View>

        {isItemized ? (
          items.map((item, i) => (
            <View key={`${item.label}-${i}`} style={s.itemRow}>
              <Text style={s.lineTitle}>{item.label}</Text>
              <Text style={s.amount}>{formatLKR(item.amount)}</Text>
            </View>
          ))
        ) : (
          <View style={s.itemRow}>
            <View>
              <Text style={s.lineTitle}>
                {ticket.solution || ticket.issueTitle}
              </Text>
              {ticket.partsUsed ? (
                <Text style={s.lineParts}>Parts: {ticket.partsUsed}</Text>
              ) : null}
            </View>
            <Text style={s.amount}>{formatLKR(subtotal)}</Text>
          </View>
        )}

        {showSubtotal ? (
          <View style={s.summaryRow}>
            <Text style={{ color: C.gray500 }}>Subtotal</Text>
            <Text style={{ color: C.gray500 }}>{formatLKR(subtotal)}</Text>
          </View>
        ) : null}
        {discountAmount > 0 ? (
          <View style={s.summaryRow}>
            <Text style={{ color: C.gray500 }}>{discountLabel}</Text>
            <Text style={{ color: C.gray500 }}>-{formatLKR(discountAmount)}</Text>
          </View>
        ) : null}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>{formatLKR(total)}</Text>
        </View>

        {/* Paid seal / balance due */}
        {isSettled ? (
          <View style={s.sealWrap}>
            <View style={s.seal}>
              <Text style={s.sealText}>PAID</Text>
              {paidMeta ? <Text style={s.sealMeta}>{paidMeta}</Text> : null}
            </View>
          </View>
        ) : (
          <View style={s.dueBox}>
            <Text style={s.dueLabel}>Balance due</Text>
            <Text style={s.dueValue}>{formatLKR(total)}</Text>
          </View>
        )}

        {/* How to pay */}
        {!isSettled && show.payment && total > 0 ? (
          <View style={s.panel}>
            <Text style={s.sectionLabel}>How to pay</Text>
            <Text style={{ fontSize: 9.5, color: C.gray500, marginTop: 5 }}>
              Transfer to the account below (quote {ticket.ticketNumber} as the
              reference) or pay in store.
            </Text>
            <View style={s.payGrid}>
              <View style={s.payCol}>
                <Text style={s.faint}>Bank:&nbsp;</Text>
                <Text style={s.strong}>{payTo.bankName}</Text>
              </View>
              <View style={s.payCol}>
                <Text style={s.faint}>Branch:&nbsp;</Text>
                <Text style={s.strong}>{payTo.branch}</Text>
              </View>
              <View style={s.payCol}>
                <Text style={s.faint}>Account name:&nbsp;</Text>
                <Text style={s.strong}>{payTo.accountName}</Text>
              </View>
              <View style={s.payCol}>
                <Text style={s.faint}>Account no:&nbsp;</Text>
                <Text style={s.strong}>{payTo.accountNumber}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Specific warranty */}
        {showWarranty ? (
          <View style={s.panel}>
            <Text style={s.sectionLabel}>Warranty</Text>
            <Text style={{ marginTop: 5, color: C.body }}>
              {ticket.warrantyPeriod} warranty
              {ticket.warrantyParts ? ` on ${ticket.warrantyParts}` : ""}.
            </Text>
          </View>
        ) : null}

        {/* Notes */}
        {show.notes && ticket.billNotes ? (
          <View style={s.panel}>
            <Text style={s.sectionLabel}>Notes</Text>
            <Text style={s.notesText}>{ticket.billNotes}</Text>
          </View>
        ) : null}

        {/* Track QR */}
        {show.track ? (
          <View style={s.trackBox}>
            <Image style={s.trackQr} src={trackQr} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: SERIF_BOLD, fontSize: 10, color: C.ink900 }}>
                Track this repair anytime
              </Text>
              <Text style={{ fontSize: 8.5, color: C.gray500, marginTop: 3 }}>
                Scan the code or enter ticket {ticket.ticketNumber} on our online
                tracker — live status, no sign-in needed.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.quote}>&ldquo;{BILL_QUOTE}&rdquo;</Text>
          <Text style={s.warrantyTerms}>
            <Text style={{ fontFamily: SERIF_BOLD, color: C.gray500 }}>
              Warranty terms:{" "}
            </Text>
            {WARRANTY_TERMS}
          </Text>
          <Text style={s.footerContact}>
            {SHOP.name} · {SHOP.phone} · {SHOP.email}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBillPdf(ticket: BillTicket) {
  const trackQr = await trackQrDataUrl(ticket.ticketNumber);
  return renderToBuffer(<BillPdf ticket={ticket} trackQr={trackQr} />);
}
