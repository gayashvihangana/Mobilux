"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  Link2,
  Loader2,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
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
import {
  DEVICE_TYPES,
  doneDescription,
  STATUS_META,
  STATUS_PIPELINE,
} from "@/lib/status";

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

// The next/previous status in the normal pipeline. SUBMITTED is excluded
// from "next" — that transition is handled by the dedicated Accept card
// with its own wording. CANCELLED isn't part of the pipeline at all, so
// it has neither.
function nextStatusOf(status: TicketStatus): TicketStatus | undefined {
  if (status === "SUBMITTED") return undefined;
  const index = STATUS_PIPELINE.indexOf(status);
  if (index === -1 || index === STATUS_PIPELINE.length - 1) return undefined;
  return STATUS_PIPELINE[index + 1];
}
function prevStatusOf(status: TicketStatus): TicketStatus | undefined {
  const index = STATUS_PIPELINE.indexOf(status);
  if (index <= 0) return undefined;
  return STATUS_PIPELINE[index - 1];
}

// Button text for each forward transition. Deliberately hand-written
// rather than derived from the destination's label: a few destinations
// (DIAGNOSING, AWAITING_PARTS) name an ongoing activity, so "Mark as
// Diagnosing" reads as if diagnosis were already finished. These name
// what's actually completing at the current step instead.
const STEP_ACTION: Partial<Record<TicketStatus, string>> = {
  CONFIRMED: "Mark as Received",
  RECEIVED: "Start Diagnosing",
  DIAGNOSING: "Mark as Diagnosed",
  AWAITING_PARTS: "Mark as Parts Arrived",
  IN_PROGRESS: "Mark as Completed",
  COMPLETED: "Mark as Ready for Pickup",
  READY_FOR_PICKUP: "Mark as Picked Up",
};

export function StatusUpdateForm({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
}) {
  const [state, formAction, pending] = useActionState(updateTicketStatus, null);
  useSuccessToast(state, "Status updated.");
  const [selected, setSelected] = useState<TicketStatus>(currentStatus);
  const [showOverride, setShowOverride] = useState(false);
  useEffect(() => setSelected(currentStatus), [currentStatus]);

  const next = nextStatusOf(currentStatus);
  const prev = prevStatusOf(currentStatus);

  // Whichever submit button is clicked supplies the "status" field, so
  // the next-step button, the go-back button, and the manual override
  // all share one form (and one note).
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <FormError state={state} />
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

      {next ? (
        <Button
          type="submit"
          name="status"
          value={next}
          className="h-auto w-full flex-col items-start gap-0.5 py-3 text-left whitespace-normal"
          disabled={pending}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {STEP_ACTION[currentStatus] ?? `Mark as ${STATUS_META[next].label}`}
          </span>
          <span className="text-xs font-normal opacity-80">
            {doneDescription(next)}
          </span>
        </Button>
      ) : (
        <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          {currentStatus === "CANCELLED"
            ? "This repair is cancelled — reopen it below if needed."
            : "This is the last step — nothing further to mark."}
        </p>
      )}

      {prev ? (
        <Button
          type="submit"
          name="status"
          value={prev}
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          disabled={pending}
        >
          <Undo2 className="size-3.5" />
          Go back to {STATUS_META[prev].label}
        </Button>
      ) : null}

      {!showOverride ? (
        <button
          type="button"
          onClick={() => setShowOverride(true)}
          className="flex w-full items-center justify-center gap-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Need to skip a step or cancel this repair?
          <ChevronDown className="size-3.5" />
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
          <Label htmlFor="status" className="text-xs text-muted-foreground">
            Set any status directly
          </Label>
          <div className="flex gap-2">
            <Select
              value={selected}
              onValueChange={(value) => setSelected(value as TicketStatus)}
            >
              <SelectTrigger id="status" className="flex-1" aria-label="New status">
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
            <Button
              type="submit"
              name="status"
              value={selected}
              variant="secondary"
              disabled={pending || selected === currentStatus}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Set
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

// Shown only while a ticket is SUBMITTED (customer-submitted online, not
// yet accepted). Accepting moves it to CONFIRMED — the request is agreed,
// but "Received" is reserved for the device physically arriving at the
// shop. Reuses updateTicketStatus, so the customer gets the same
// notification/email as any other timeline step.
export function AcceptTicketForm({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState(updateTicketStatus, null);
  useSuccessToast(state, "Request confirmed — customer notified.");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="status" value="CONFIRMED" />
      <FormError state={state} />
      <div className="space-y-2">
        <Label htmlFor="accept-note">
          Note for customer <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="accept-note"
          name="note"
          rows={3}
          placeholder="e.g. We can take this in — drop your device any day 9am–7pm."
          className="resize-none"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        {pending ? "Accepting…" : "Accept request"}
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
