import { currentUser } from "@/lib/auth-guard";
import { can } from "@/lib/permissions";
import { fetchBillTicket } from "@/lib/bill-data";
import { getShopInfo, getShopPayTo } from "@/lib/settings";
import { trackQrDataUrl } from "@/lib/track-qr";
import { pdfResponse, renderBillPdf } from "@/lib/bill-pdf";

// Downloads the bill as a PDF file (no new page, no print dialog). Same
// access as the bill page: staff who can make bills, or the customer whose
// repair it is.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });

  const { id } = await params;
  const result = await fetchBillTicket(id);
  if (!result || (!can(user, "bill:write") && result.customerId !== user.id)) {
    return new Response("Not found", { status: 404 });
  }

  const [shop, shopPayTo, trackQr] = await Promise.all([
    getShopInfo(),
    getShopPayTo(),
    trackQrDataUrl(result.trackToken),
  ]);
  return pdfResponse(await renderBillPdf({ ticket: result.bill, shop, shopPayTo, trackQr }));
}
