import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchBillTicket } from "@/lib/bill-data";
import { renderBillPdf } from "@/lib/bill-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await fetchBillTicket(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = result.customerId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdf = await renderBillPdf(result.bill);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Mobilux-${result.bill.ticketNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
