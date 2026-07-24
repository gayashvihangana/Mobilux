"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Ban, CircleCheck, Loader2, TriangleAlert, UserPlus } from "lucide-react";
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
  setCustomerBlocked,
  type CustomerFormState,
} from "@/lib/actions/customers";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  blocked: boolean;
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

export function CustomerDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCustomer, null);
  useFormToast(state, "Customer account created.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" /> New customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New customer account</DialogTitle>
            <DialogDescription>
              Create a login for a customer with an email and password. Details
              can&apos;t be edited afterwards — customers manage their own
              profile.
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
                placeholder="name@example.com"
                required
              />
              <FieldError errors={state?.fieldErrors?.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" name="phone" placeholder="07XXXXXXXX" />
              <FieldError errors={state?.fieldErrors?.phone} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
            />
            <FieldError errors={state?.fieldErrors?.password} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BlockToggle({ customer }: { customer: CustomerRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(setCustomerBlocked, null);
  const blocking = !customer.blocked;
  useFormToast(
    state,
    blocking ? "Customer blocked." : "Customer unblocked.",
    () => setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {blocking ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Ban className="size-4" /> Block
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-success hover:text-success">
            <CircleCheck className="size-4" /> Unblock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={customer.id} />
          <input type="hidden" name="blocked" value={blocking ? "true" : "false"} />
          <DialogHeader>
            <DialogTitle>
              {blocking ? `Block ${customer.name}?` : `Unblock ${customer.name}?`}
            </DialogTitle>
            <DialogDescription>
              {blocking
                ? "They won't be able to log in until you unblock them. Their repairs and history are kept."
                : "They'll be able to log in again right away."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={blocking ? "destructive" : "default"}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {blocking ? "Block customer" : "Unblock customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
