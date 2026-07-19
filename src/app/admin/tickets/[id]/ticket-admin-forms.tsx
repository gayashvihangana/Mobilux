"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Link2, Loader2, Trash2, TriangleAlert } from "lucide-react";
import type { DeviceType, TicketStatus } from "@prisma/client";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteTicket,
  linkTicketCustomer,
  updateTicketDetails,
  updateTicketStatus,
  type TicketFormState,
} from "@/lib/actions/tickets";
import { DEVICE_TYPES, STATUS_META } from "@/lib/status";

function useSuccessToast(state: TicketFormState, message: string) {
  const last = useRef<TicketFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) toast.success(message);
      else if (state?.error) toast.error(state.error);
    }
    last.current = state;
  }, [state, message]);
}

function FormError({ state }: { state: TicketFormState }) {
  if (!state?.error) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <TriangleAlert className="size-4 shrink-0" />
      {state.error}
    </div>
  );
}

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value: value as TicketStatus,
  label: meta.label,
}));

export function StatusUpdateForm({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
}) {
  const [state, formAction, pending] = useActionState(updateTicketStatus, null);
  useSuccessToast(state, "Status updated.");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <FormError state={state} />
      <div className="space-y-2">
        <Label htmlFor="status">New status</Label>
        <Select name="status" defaultValue={currentStatus} key={currentStatus}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">
          Note for customer <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          placeholder="e.g. Replacement display fitted, running final tests."
          className="resize-none"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Updating…" : "Update status"}
      </Button>
    </form>
  );
}

// Shown only while a ticket is SUBMITTED (customer-submitted online, not
// yet accepted). Accepting moves it to RECEIVED and enters the normal
// pipeline — same updateTicketStatus action other status changes use,
// so it notifies the customer by notification/email exactly like any
// other timeline step, just with a friendlier one-purpose form.
export function AcceptTicketForm({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState(updateTicketStatus, null);
  useSuccessToast(state, "Repair accepted — customer notified.");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="status" value="RECEIVED" />
      <FormError state={state} />
      <div className="space-y-2">
        <Label htmlFor="accept-note">
          Note for customer <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="accept-note"
          name="note"
          rows={3}
          placeholder="e.g. Got it — we'll start diagnosing today."
          className="resize-none"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        {pending ? "Accepting…" : "Accept repair"}
      </Button>
    </form>
  );
}

export type TicketDetailsValues = {
  ticketId: string;
  deviceType: DeviceType;
  brand: string | null;
  model: string | null;
  issueTitle: string;
  issueDescription: string | null;
  solution: string | null;
  status: TicketStatus;
  completedAt: string | null; // yyyy-mm-dd
  estimatedCost: string | null;
  finalCost: string | null;
  partsCost: string | null;
  paidAmount: string | null;
  duration: string | null;
  partsUsed: string | null;
  partsSupplier: string | null;
  adminNotes: string | null;
  forgottenParts: string | null;
};

export function TicketDetailsForm({ values }: { values: TicketDetailsValues }) {
  const [state, formAction, pending] = useActionState(updateTicketDetails, null);
  useSuccessToast(state, "Repair details saved.");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={values.ticketId} />
      <input type="hidden" name="status" value={values.status} />
      <FormError state={state} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="deviceType">Device type</Label>
          <Select name="deviceType" defaultValue={values.deviceType}>
            <SelectTrigger id="deviceType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" name="brand" defaultValue={values.brand ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" name="model" defaultValue={values.model ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issueTitle">Issue</Label>
        <Input
          id="issueTitle"
          name="issueTitle"
          defaultValue={values.issueTitle}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issueDescription">Issue details</Label>
        <Textarea
          id="issueDescription"
          name="issueDescription"
          rows={2}
          defaultValue={values.issueDescription ?? ""}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="solution">Solution</Label>
        <Textarea
          id="solution"
          name="solution"
          rows={2}
          defaultValue={values.solution ?? ""}
          placeholder="What was done to fix it"
          className="resize-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="estimatedCost">Quoted (LKR)</Label>
          <Input
            id="estimatedCost"
            name="estimatedCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={values.estimatedCost ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finalCost">Final price (LKR)</Label>
          <Input
            id="finalCost"
            name="finalCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={values.finalCost ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partsCost">Parts cost (LKR)</Label>
          <Input
            id="partsCost"
            name="partsCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={values.partsCost ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidAmount">Customer paid (LKR)</Label>
          <Input
            id="paidAmount"
            name="paidAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={values.paidAmount ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            name="duration"
            defaultValue={values.duration ?? ""}
            placeholder="e.g. 2 Hours"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="completedAt">Date completed</Label>
          <Input
            id="completedAt"
            name="completedAt"
            type="date"
            defaultValue={values.completedAt ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partsUsed">Parts used</Label>
          <Input
            id="partsUsed"
            name="partsUsed"
            defaultValue={values.partsUsed ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partsSupplier">Parts supplier</Label>
          <Input
            id="partsSupplier"
            name="partsSupplier"
            defaultValue={values.partsSupplier ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="forgottenParts">Forgotten parts</Label>
        <Input
          id="forgottenParts"
          name="forgottenParts"
          defaultValue={values.forgottenParts ?? ""}
          placeholder="e.g. 3 Screws"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminNotes">
          Notes & lessons{" "}
          <span className="text-muted-foreground">
            (private — never shown to the customer)
          </span>
        </Label>
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={4}
          defaultValue={values.adminNotes ?? ""}
          placeholder="What went wrong, what you'd do differently, anything worth remembering…"
          className="resize-none"
        />
      </div>

      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}

export function DeleteTicketDialog({
  ticketId,
  ticketNumber,
}: {
  ticketId: string;
  ticketNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteTicket, null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" /> Delete record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticketId} />
          <DialogHeader>
            <DialogTitle>Delete {ticketNumber}?</DialogTitle>
            <DialogDescription>
              This permanently removes the repair record, its timeline, and
              your notes. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {state?.error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete permanently
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LinkCustomerForm({
  ticketId,
  currentCustomerId,
  customers,
}: {
  ticketId: string;
  currentCustomerId: string | null;
  customers: { id: string; name: string; email: string }[];
}) {
  const [selected, setSelected] = useState(currentCustomerId ?? "none");
  const [state, formAction, pending] = useActionState(linkTicketCustomer, null);
  useSuccessToast(
    state,
    selected === "none" ? "Account unlinked." : "Customer account linked.",
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Select name="userId" value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No account (name only)</SelectItem>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} — {c.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={pending || selected === (currentCustomerId ?? "none")}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Link2 className="size-4" />
        )}
        {selected === "none" ? "Unlink account" : "Link account"}
      </Button>
    </form>
  );
}
