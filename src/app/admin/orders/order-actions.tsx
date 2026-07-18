"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, PackageCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateOrderStatus,
  type OrderFormState,
} from "@/lib/actions/orders";

function useOrderToast(state: OrderFormState, message: string) {
  const last = useRef<OrderFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) toast.success(message);
      else if (state?.error) toast.error(state.error);
    }
    last.current = state;
  }, [state, message]);
}

export function FulfillOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(updateOrderStatus, null);
  useOrderToast(state, "Order marked as fulfilled.");

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value="FULFILLED" />
      <Button size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PackageCheck className="size-4" />
        )}
        Fulfill
      </Button>
    </form>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(updateOrderStatus, null);
  useOrderToast(state, "Order cancelled and stock restored.");

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value="CANCELLED" />
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive"
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        Cancel
      </Button>
    </form>
  );
}
