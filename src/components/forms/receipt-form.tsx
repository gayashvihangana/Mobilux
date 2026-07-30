"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileInput } from "@/components/forms/file-input";
import { submitReceipt, type PaymentFormState } from "@/lib/actions/payments";

export function ReceiptForm({
  ticketId,
  orderId,
}: {
  ticketId?: string;
  orderId?: string;
}) {
  const [state, formAction, pending] = useActionState(submitReceipt, null);
  const last = useRef<PaymentFormState>(null);

  useEffect(() => {
    if (state !== last.current && state?.success) {
      toast.success("Receipt submitted — we'll verify it shortly.");
    }
    last.current = state;
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {ticketId ? (
        <input type="hidden" name="ticketId" value={ticketId} />
      ) : null}
      {orderId ? <input type="hidden" name="orderId" value={orderId} /> : null}
      {state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="reference">
          Bank reference <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="reference"
          name="reference"
          placeholder="e.g. transfer confirmation number"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt">Transfer receipt</Label>
        <FileInput
          id="receipt"
          name="receipt"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          className="cursor-pointer file:text-primary"
        />
        <p className="text-xs text-muted-foreground">
          Photo or PDF of your bank transfer slip — photos are shrunk
          automatically, PDFs must be under 4 MB.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileUp className="size-4" />
        )}
        {pending ? "Uploading…" : "Submit receipt"}
      </Button>
    </form>
  );
}
