"use client";

import { useActionState } from "react";
import { Loader2, ShoppingBag, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrder } from "@/lib/actions/orders";

export function BuyForm({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const [state, formAction, pending] = useActionState(createOrder, null);
  const max = Math.min(stock, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      {state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
      <div className="flex items-end gap-3">
        <div className="w-28 space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Select name="quantity" defaultValue="1">
            <SelectTrigger id="quantity" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: max }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-11 flex-1 sm:flex-none sm:px-8"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShoppingBag className="size-4" />
          )}
          {pending ? "Placing order…" : "Buy now"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Placing an order reserves your item — pay by bank transfer on the next
        screen and collect at the shop.
      </p>
    </form>
  );
}
