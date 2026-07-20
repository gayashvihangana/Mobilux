import * as React from "react";
import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { SHOP, WARRANTY_DAYS } from "@/lib/config";
import { trackQrDataUrl } from "@/lib/track-qr";
import { computeBill, type BillTicket } from "@/lib/bill";
import { doneLabel } from "@/lib/status";
import { formatDate, formatLKR } from "@/lib/utils";

// Mirrors the on-screen BillDocument palette (Tailwind blue/neutral hexes).
const C = {
  blue: "#2563eb",
  blueLight: "#dbeafe",
  ink: "#171717",
  gray500: "#737373",
  gray400: "#a3a3a3",
  border: "#e5e5e5",
  borderLight: "#f5f5f5",
  panel: "#fafafa",
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  green: "#15803d",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
  amber: "#b45309",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.ink,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: C.blue,
    color: "#ffffff",
    paddingHorizontal: 40,
    paddingVertical: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shopName: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  tagline: { fontSize: 9, color: C.blueLight, marginTop: 3 },
  invoiceLabel: {
    fontSize: 8,
    color: C.blueLight,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "right",
  },
  ticketNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginTop: 3,
  },
  headerDate: { fontSize: 9, color: C.blueLight, textAlign: "right", marginTop: 3 },
  body: { paddingHorizontal: 40, paddingTop: 30 },
  sectionLabel: {
    fontSize: 7.5,
    color: C.gray400,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  partiesRow: { flexDirection: "row", justifyContent: "space-between" },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 5 },
  partyDetail: { color: C.gray500, marginTop: 2.5 },
  deviceBox: {
    marginTop: 26,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
  },
  deviceCol: { flex: 1 },
  deviceLabel: { fontSize: 7.5, color: C.gray400, textTransform: "uppercase" },
  deviceValue: { marginTop: 3, fontFamily: "Helvetica-Bold" },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 6,
    marginTop: 28,
  },
  th: {
    fontSize: 7.5,
    color: C.gray400,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    paddingVertical: 12,
  },
  lineTitle: { fontFamily: "Helvetica-Bold", maxWidth: 380 },
  lineParts: { fontSize: 8.5, color: C.gray500, marginTop: 3 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    marginTop: 14,
    gap: 16,
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  statusBox: {
    marginTop: 28,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notesBox: {
    marginTop: 24,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 14,
  },
  notesText: { fontSize: 9.5, color: C.gray500, marginTop: 5, lineHeight: 1.5 },
  trackBox: {
    marginTop: 28,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  trackQr: { width: 64, height: 64 },
  footer: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
    textAlign: "center",
  },
  footerText: { fontSize: 8.5, color: C.gray400, marginTop: 3 },
});

function BillPdf({ ticket, trackQr }: { ticket: BillTicket; trackQr: string }) {
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

  const accent = isSettled ? C.green : C.amber;

  return (
    <Document
      title={`${SHOP.name} invoice ${ticket.ticketNumber}`}
      author={SHOP.name}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.shopName}>{SHOP.name}</Text>
            <Text style={s.tagline}>Fix. Track. Trust.</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>Invoice</Text>
            <Text style={s.ticketNumber}>{ticket.ticketNumber}</Text>
            <Text style={s.headerDate}>{formatDate(billDate)}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.partiesRow}>
            <View>
              <Text style={s.sectionLabel}>Billed to</Text>
              <Text style={s.partyName}>{owner}</Text>
              {ticket.customer?.email ? (
                <Text style={s.partyDetail}>{ticket.customer.email}</Text>
              ) : null}
              {ticket.customer?.phone ? (
                <Text style={s.partyDetail}>{ticket.customer.phone}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.sectionLabel}>From</Text>
              <Text style={s.partyName}>{SHOP.name}</Text>
              <Text style={s.partyDetail}>{SHOP.city}</Text>
              <Text style={s.partyDetail}>{SHOP.phone}</Text>
              <Text style={s.partyDetail}>{SHOP.email}</Text>
            </View>
          </View>

          <View style={s.deviceBox}>
            <View style={s.deviceCol}>
              <Text style={s.deviceLabel}>Device</Text>
              <Text style={s.deviceValue}>{deviceName}</Text>
            </View>
            <View style={s.deviceCol}>
              <Text style={s.deviceLabel}>Issue</Text>
              <Text style={s.deviceValue}>{ticket.issueTitle}</Text>
            </View>
            <View style={s.deviceCol}>
              <Text style={s.deviceLabel}>Status</Text>
              <Text style={s.deviceValue}>{doneLabel(ticket.status)}</Text>
            </View>
          </View>

          <View style={s.tableHead}>
            <Text style={s.th}>Description</Text>
            <Text style={s.th}>Amount</Text>
          </View>
          <View style={s.lineRow}>
            <View>
              <Text style={s.lineTitle}>
                {ticket.solution || ticket.issueTitle}
              </Text>
              {ticket.partsUsed ? (
                <Text style={s.lineParts}>Parts: {ticket.partsUsed}</Text>
              ) : null}
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {formatLKR(subtotal)}
            </Text>
          </View>
          {discountAmount > 0 ? (
            <View style={s.lineRow}>
              <Text style={{ color: C.blue }}>
                Loyalty discount ({discountPercent}%)
              </Text>
              <Text style={{ color: C.blue }}>-{formatLKR(discountAmount)}</Text>
            </View>
          ) : null}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{formatLKR(total)}</Text>
          </View>

          <View
            style={[
              s.statusBox,
              {
                backgroundColor: isSettled ? C.greenBg : C.amberBg,
                borderColor: isSettled ? C.greenBorder : C.amberBorder,
              },
            ]}
          >
            <View>
              <Text style={{ fontFamily: "Helvetica-Bold", color: accent, fontSize: 11 }}>
                {isSettled ? "Paid in full" : "Balance due"}
              </Text>
              {ticket.paidPayment ? (
                <Text style={{ fontSize: 8.5, color: C.gray500, marginTop: 3 }}>
                  Confirmed {formatDate(ticket.paidPayment.createdAt)}
                </Text>
              ) : null}
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold", color: accent, fontSize: 14 }}>
              {formatLKR(total)}
            </Text>
          </View>

          {ticket.billNotes ? (
            <View style={s.notesBox}>
              <Text style={s.sectionLabel}>Notes</Text>
              <Text style={s.notesText}>{ticket.billNotes}</Text>
            </View>
          ) : null}

          <View style={s.trackBox}>
            <Image style={s.trackQr} src={trackQr} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>
                Track this repair anytime
              </Text>
              <Text style={{ fontSize: 8.5, color: C.gray500, marginTop: 3 }}>
                Scan the code or enter ticket {ticket.ticketNumber} on our
                online tracker — live status, no sign-in needed.
              </Text>
            </View>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>
              {warrantyExpiry
                ? `Covered by a ${WARRANTY_DAYS}-day service warranty, valid until ${formatDate(warrantyExpiry)}.`
                : `Covered by a ${WARRANTY_DAYS}-day service warranty from completion.`}
            </Text>
            <Text style={s.footerText}>
              Thank you for trusting {SHOP.name} with your device.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBillPdf(ticket: BillTicket) {
  const trackQr = await trackQrDataUrl(ticket.ticketNumber);
  return renderToBuffer(<BillPdf ticket={ticket} trackQr={trackQr} />);
}
