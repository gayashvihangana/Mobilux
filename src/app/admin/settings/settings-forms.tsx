"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import {
  addBankAccount,
  deleteBankAccount,
  makePrimaryBankAccount,
  updateBankAccount,
  updateShopInfo,
  type SettingsFormState,
} from "@/lib/actions/settings";
import type { BankAccount, ShopInfo } from "@/lib/settings";

function useFormToast(
  state: SettingsFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<SettingsFormState>(null);
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

export function BankAccountDialog({ account }: { account?: BankAccount }) {
  const [open, setOpen] = useState(false);
  const editing = !!account;
  const [state, formAction, pending] = useActionState(
    editing ? updateBankAccount : addBankAccount,
    null,
  );
  useFormToast(state, editing ? "Account updated." : "Account added.", () =>
    setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit account</span>
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Add account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={account.id} /> : null}
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit bank account" : "Add bank account"}
            </DialogTitle>
            <DialogDescription>
              Accounts customers can pay into. The default account shows on
              unpaid bills.
            </DialogDescription>
          </DialogHeader>

          {state?.error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                name="bankName"
                defaultValue={account?.bankName ?? ""}
                placeholder="e.g. Commercial Bank"
                required
              />
              <FieldError errors={state?.fieldErrors?.bankName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                name="branch"
                defaultValue={account?.branch ?? ""}
                placeholder="e.g. Kandy"
              />
              <FieldError errors={state?.fieldErrors?.branch} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                name="accountName"
                defaultValue={account?.accountName ?? ""}
                placeholder="e.g. Mobilux (Pvt) Ltd"
                required
              />
              <FieldError errors={state?.fieldErrors?.accountName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number</Label>
              <Input
                id="accountNumber"
                name="accountNumber"
                defaultValue={account?.accountNumber ?? ""}
                placeholder="e.g. 1000234567"
                required
              />
              <FieldError errors={state?.fieldErrors?.accountNumber} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MakePrimaryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await makePrimaryBankAccount(id);
          if (result?.error) toast.error(result.error);
          else toast.success("Default account updated.");
        })
      }
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Star className="size-3.5" />
      )}
      Make default
    </Button>
  );
}

export function DeleteBankAccountButton({ account }: { account: BankAccount }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteBankAccount, null);
  useFormToast(state, "Account removed.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete account</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={account.id} />
          <DialogHeader>
            <DialogTitle>Remove this account?</DialogTitle>
            <DialogDescription>
              {account.bankName} · {account.accountNumber} will no longer be
              available to pay into. This won&apos;t change bills already issued.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Remove account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Read-only summary until the admin taps Edit — the same "show what's set,
// edit on demand" shape the bank accounts list uses, so the settings page
// reads as a summary rather than a wall of inputs.
export function ShopInfoForm({ info }: { info: ShopInfo }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateShopInfo, null);
  useFormToast(state, "Shop details saved.", () => setEditing(false));

  if (!editing) {
    const rows: { label: string; value: string; wide?: boolean }[] = [
      { label: "Shop name", value: info.name },
      { label: "Tagline", value: info.tagline },
      { label: "Phone", value: info.phone },
      { label: "Email", value: info.email },
      { label: "Address / location", value: info.address, wide: true },
      { label: "Opening hours", value: info.hours, wide: true },
    ];
    return (
      <div className="space-y-4">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className={row.wide ? "sm:col-span-2" : undefined}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 font-medium">{row.value || "—"}</dd>
            </div>
          ))}
        </dl>
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="size-4" /> Edit shop details
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Shop name</Label>
          <Input id="name" name="name" defaultValue={info.name} required />
          <FieldError errors={state?.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" name="tagline" defaultValue={info.tagline} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={info.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" defaultValue={info.email} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address / location</Label>
          <Input
            id="address"
            name="address"
            defaultValue={info.address}
            placeholder="e.g. 123 Galle Rd, Colombo 03"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="hours">Opening hours</Label>
          <Input
            id="hours"
            name="hours"
            defaultValue={info.hours}
            placeholder="e.g. Mon–Sat, 9:00 AM – 7:00 PM"
          />
          <p className="text-xs text-muted-foreground">
            Shown on the bill and in the &ldquo;ready for pickup&rdquo; message
            customers receive.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save shop details
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
