import QRCode from "qrcode";
import { SITE_URL } from "@/lib/config";

// The tracking link IS the credential for a walk-in customer with no account,
// so it is keyed on the ticket's unguessable trackToken rather than its
// sequential REP-### number. Scanning the QR on a printed bill opens the
// repair directly; typing the ticket number into /track still works, but has
// to be backed by the phone number on file (see the tracker page).
export function trackUrl(trackToken: string) {
  return `${SITE_URL}/track/${encodeURIComponent(trackToken)}`;
}

// PNG data URL of a QR code pointing at the public tracker — embedded in
// the on-screen bill and the PDF so customers can scan the printed copy.
export function trackQrDataUrl(trackToken: string) {
  return QRCode.toDataURL(trackUrl(trackToken), {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
  });
}
