import QRCode from "qrcode";
import { SITE_URL } from "@/lib/config";

export function trackUrl(ticketNumber: string) {
  return `${SITE_URL}/track?t=${encodeURIComponent(ticketNumber)}`;
}

// PNG data URL of a QR code pointing at the public tracker — embedded in
// the on-screen bill and the PDF so customers can scan the printed copy.
export function trackQrDataUrl(ticketNumber: string) {
  return QRCode.toDataURL(trackUrl(ticketNumber), {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
  });
}
