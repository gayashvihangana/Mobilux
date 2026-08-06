import type { Order, Payment } from "@prisma/client";
import { CheckCircle2, Clock, Landmark, PackageCheck, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReceiptForm } from "@/components/forms/receipt-form";
import { getShopInfo, getShopPayTo } from "@/lib/settings";
import { formatDateTime, formatLKR } from "@/lib/utils";

export async function OrderPaymentCard({
  order,
  latestPayment,
}: {
  order: Pick<Order, "id" | "status" | "total">;
  latestPayment: Payment | null;
}) {
  // Same account the bill prints — see the note in repairs/[id]/payment-card.
  const [payTo, shop] = await Promise.all([getShopPayTo(), getShopInfo()]);

  if (order.status === "CANCELLED") {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <XCircle className="size-5 text-destructive" /> Order cancelled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This order was cancelled and any reserved stock has been released.
            Contact us if this looks wrong.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (order.status === "FULFILLED") {
    return (
      <Card className="border-success/30">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <PackageCheck className="size-5 text-success" /> Fulfilled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Order complete — thank you for shopping with {shop.name}!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (order.status === "PAID" || latestPayment?.status === "PAID") {
    return (
      <Card className="border-success/30">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <CheckCircle2 className="size-5 text-success" /> Paid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-display text-lg font-bold text-success">
              {formatLKR(order.total.toString())}
            </span>
          </div>
          {latestPayment?.verifiedAt ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confirmed</span>
              <span className="font-medium">
                {formatDateTime(latestPayment.verifiedAt)}
              </span>
            </div>
          ) : null}
          <p className="rounded-lg bg-success/10 p-3 text-xs text-success">
            Payment confirmed — collect your order at the shop, or contact us
            for delivery.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (latestPayment?.status === "PENDING_VERIFICATION") {
    return (
      <Card className="border-warning/30">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Clock className="size-5 text-warning" /> Receipt under review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-display text-lg font-bold">
              {formatLKR(latestPayment.amount.toString())}
            </span>
          </div>
          <p className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
            We&apos;re verifying your bank transfer. You&apos;ll get a
            notification as soon as it&apos;s confirmed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="font-display text-lg">Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestPayment?.status === "REJECTED" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Your previous receipt couldn&apos;t be verified
            {latestPayment.adminNote ? `: ${latestPayment.adminNote}` : "."}{" "}
            Please submit it again.
          </div>
        ) : null}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">To pay</span>
          <span className="font-display text-xl font-bold">
            {formatLKR(order.total.toString())}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Landmark className="size-4 text-primary" /> Bank transfer details
          </p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Bank</dt>
              <dd className="text-right font-medium">{payTo.bankName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="text-right font-medium">{payTo.branch}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account name</dt>
              <dd className="text-right font-medium">{payTo.accountName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account no.</dt>
              <dd className="text-right font-mono font-medium">
                {payTo.accountNumber}
              </dd>
            </div>
          </dl>
        </div>

        <ReceiptForm orderId={order.id} />
      </CardContent>
    </Card>
  );
}
