import type { Payment, RepairTicket } from "@prisma/client";
import {
  BadgePercent,
  CheckCircle2,
  Clock,
  Info,
  Landmark,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BANK_DETAILS } from "@/lib/config";
import { applyDiscount } from "@/lib/loyalty";
import { formatDateTime, formatLKR } from "@/lib/utils";
import { ReceiptForm } from "./receipt-form";

export function PaymentCard({
  ticket,
  latestPayment,
  discountPercent,
}: {
  ticket: Pick<RepairTicket, "id" | "estimatedCost" | "finalCost">;
  latestPayment: Payment | null;
  discountPercent: number;
}) {
  // Final price not confirmed yet — show estimate only
  if (!ticket.finalCost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Cost</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated</span>
            <span className="font-medium">
              {ticket.estimatedCost
                ? formatLKR(ticket.estimatedCost.toString())
                : "Pending diagnosis"}
            </span>
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            The final price is confirmed after diagnosis. Payment options appear
            here once it&apos;s set.
          </p>
        </CardContent>
      </Card>
    );
  }

  const finalCost = Number(ticket.finalCost);
  const payable = applyDiscount(finalCost, discountPercent);

  // Paid
  if (latestPayment?.status === "PAID") {
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
              {formatLKR(latestPayment.amount.toString())}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Method</span>
            <span className="font-medium">Bank transfer</span>
          </div>
          {latestPayment.verifiedAt ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confirmed</span>
              <span className="font-medium">
                {formatDateTime(latestPayment.verifiedAt)}
              </span>
            </div>
          ) : null}
          <p className="rounded-lg bg-success/10 p-3 text-xs text-success">
            Payment confirmed — thank you! This repair counts toward your
            loyalty rewards.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Awaiting verification
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
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Submitted</span>
            <span className="font-medium">
              {formatDateTime(latestPayment.createdAt)}
            </span>
          </div>
          <p className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
            We&apos;re verifying your bank transfer. You&apos;ll get a
            notification as soon as it&apos;s confirmed.
          </p>
          {latestPayment.receiptUrl ? (
            <a
              href={latestPayment.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-primary hover:underline"
            >
              View submitted receipt
            </a>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // Payable (no payment yet, or last one was rejected)
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

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Repair cost</span>
            <span className="font-medium">{formatLKR(finalCost)}</span>
          </div>
          {discountPercent > 0 ? (
            <div className="flex items-center justify-between text-success">
              <span className="flex items-center gap-1.5">
                <BadgePercent className="size-3.5" />
                Loyalty discount ({discountPercent}%)
              </span>
              <span className="font-medium">
                −{formatLKR(finalCost - payable)}
              </span>
            </div>
          ) : null}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">To pay</span>
            <span className="font-display text-xl font-bold">
              {formatLKR(payable)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Landmark className="size-4 text-primary" /> Bank transfer details
          </p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Bank</dt>
              <dd className="text-right font-medium">{BANK_DETAILS.bankName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="text-right font-medium">{BANK_DETAILS.branch}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account name</dt>
              <dd className="text-right font-medium">{BANK_DETAILS.accountName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account no.</dt>
              <dd className="text-right font-mono font-medium">
                {BANK_DETAILS.accountNumber}
              </dd>
            </div>
          </dl>
        </div>

        <ReceiptForm ticketId={ticket.id} />
      </CardContent>
    </Card>
  );
}
