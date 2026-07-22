"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateShopBankDetails,
  type SettingsFormState,
} from "@/lib/actions/settings";
import type { ShopPayTo } from "@/lib/settings";

export function ShopBankForm({ payTo }: { payTo: ShopPayTo }) {
  const [state, formAction, pending] = useActionState(
    updateShopBankDetails,
    null,
  );
  const last = useRef<SettingsFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) toast.success("Account details saved.");
      else if (state?.error) toast.error(state.error);
    }
    last.current = state;
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank name</Label>
          <Input id="bankName" name="bankName" defaultValue={payTo.bankName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          <Input id="branch" name="branch" defaultValue={payTo.branch} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountName">Account name</Label>
          <Input
            id="accountName"
            name="accountName"
            defaultValue={payTo.accountName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account number</Label>
          <Input
            id="accountNumber"
            name="accountNumber"
            defaultValue={payTo.accountNumber}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save account details
      </Button>
    </form>
  );
}
