"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  rejectPayment,
  verifyPayment,
  type PaymentFormState,
} from "@/lib/actions/payments";

function useReviewToast(
  state: PaymentFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<PaymentFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) {
        toast.success(message);
        onSuccess?.();
      } else if (state?.error) {
        toast.error(state.error);
      }
    }
    last.current = state;
  }, [state, message, onSuccess]);
}

export function VerifyPaymentForm({ paymentId }: { paymentId: string }) {
  const [state, formAction, pending] = useActionState(verifyPayment, null);
  useReviewToast(state, "Payment verified — customer notified.");

  return (
    <form action={formAction}>
      <input type="hidden" name="paymentId" value={paymentId} />
      <Button size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Verify
      </Button>
    </form>
  );
}

export function RejectPaymentDialog({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(rejectPayment, null);
  useReviewToast(state, "Payment rejected — customer notified.", () =>
    setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
          <X className="size-4" /> Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="paymentId" value={paymentId} />
          <DialogHeader>
            <DialogTitle>Reject this receipt?</DialogTitle>
            <DialogDescription>
              The customer will be notified and asked to submit a new receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`note-${paymentId}`}>Reason (sent to customer)</Label>
            <Textarea
              id={`note-${paymentId}`}
              name="adminNote"
              rows={3}
              placeholder="e.g. Amount on the slip doesn't match the invoice."
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Reject receipt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
