import { fetchBillByToken } from "@/lib/bill-data";
import { limitByIp } from "@/lib/rate-limit";
import { getShopInfo, getShopPayTo } from "@/lib/settings";
import { trackQrDataUrl } from "@/lib/track-qr";
import { pdfResponse, renderBillPdf } from "@/lib/bill-pdf";

// The customer's bill link as a PDF file. Like the link itself, the
// unguessable token is the key, so no sign-in is needed.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const throttle = await limitByIp("track");
  if (!throttle.ok) return new Response("Too many requests", { status: 429 });

  const { token } = await params;
  const result = await fetchBillByToken(token);
  if (!result) return new Response("Not found", { status: 404 });

  const [shop, shopPayTo, trackQr] = await Promise.all([
    getShopInfo(),
    getShopPayTo(),
    trackQrDataUrl(result.trackToken),
  ]);
  return pdfResponse(await renderBillPdf({ ticket: result.bill, shop, shopPayTo, trackQr }));
}
