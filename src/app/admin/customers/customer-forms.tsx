"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, TriangleAlert, UserPlus } from "lucide-react";
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
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerFormState,
} from "@/lib/actions/customers";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

function useFormToast(
  state: CustomerFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<CustomerFormState>(null);
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

export function CustomerDialog({ customer }: { customer?: CustomerRow }) {
  const [open, setOpen] = useState(false);
  const editing = !!customer;
  const [state, formAction, pending] = useActionState(
    editing ? updateCustomer : createCustomer,
    null,
  );
  useFormToast(
    state,
    editing ? "Customer updated." : "Customer account created.",
    () => setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit customer</span>
          </Button>
        ) : (
          <Button>
            <UserPlus className="size-4" /> New customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          {editing ? (
            <input type="hidden" name="id" value={customer.id} />
          ) : null}
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit customer" : "New customer account"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the customer's details. Leave the password blank to keep it unchanged."
                : "Create a login for a customer with an email and password."}
            </DialogDescription>
          </DialogHeader>

          {state?.error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={customer?.name ?? ""}
              placeholder="e.g. Nimal Perera"
              required
            />
            <FieldError errors={state?.fieldErrors?.name} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={customer?.email ?? ""}
                placeholder="name@example.com"
                required
              />
              <FieldError errors={state?.fieldErrors?.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={customer?.phone ?? ""}
                placeholder="07XXXXXXXX"
              />
              <FieldError errors={state?.fieldErrors?.phone} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {editing ? "New password" : "Password"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={
                editing ? "Leave blank to keep current" : "At least 8 characters"
              }
              required={!editing}
            />
            <FieldError errors={state?.fieldErrors?.password} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCustomerButton({ customer }: { customer: CustomerRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteCustomer, null);
  useFormToast(state, "Customer deleted.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete customer</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={customer.id} />
          <DialogHeader>
            <DialogTitle>Delete {customer.name}?</DialogTitle>
            <DialogDescription>
              This removes the customer&apos;s login. Their past repairs are kept
              on record but will no longer be linked to an account. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
