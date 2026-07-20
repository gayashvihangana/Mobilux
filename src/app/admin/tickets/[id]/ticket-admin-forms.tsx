"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Link2,
  Loader2,
  Plus,
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
  updateBillNotes,
  updateTicketDetails,
  updateTicketStatus,
  type TicketFormState,
} from "@/lib/actions/tickets";
import {
  DEVICE_TYPES,
  doneLabel,
  nextStatus,
  prevStatus,
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

// Every status option for the advanced "set any status" override, labelled
// with its milestone (completed) name so it reads the same as everywhere
// else. CANCELLED is reached via the dedicated Cancel button instead.
const STATUS_OPTIONS = STATUS_PIPELINE.map((value) => ({
  value,
  label: doneLabel(value),
}));

// Description shown under each forward button, keyed by the status the
// ticket is leaving. The button's TITLE is derived from the milestone it
// creates — doneLabel(next) — so "click X → an X entry appears" always
// holds. These lines just say plainly what the click does.
const STEP_DESCRIPTION: Partial<Record<TicketStatus, string>> = {
  CONFIRMED: "The device has arrived at the shop.",
  RECEIVED: "You've identified the fault.",
  DIAGNOSING: "Replacement parts are in.",
  AWAITING_PARTS: "Repair work is starting.",
  IN_PROGRESS: "Repair finished and tested.",
  COMPLETED: "The customer can come and collect it.",
  READY_FOR_PICKUP: "Device handed back to the customer.",
};

// A nicer verb for the one transition where "Mark as Repair Started"
// would read awkwardly.
const STEP_TITLE_OVERRIDE: Partial<Record<TicketStatus, string>> = {
  AWAITING_PARTS: "Start Repair",
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

  // SUBMITTED is handled by the dedicated Accept card, so no forward
  // button here for it.
  const next = currentStatus === "SUBMITTED" ? null : nextStatus(currentStatus);
  const prev = prevStatus(currentStatus);
  const terminal = currentStatus === "PICKED_UP" || currentStatus === "CANCELLED";

  return (
    <div className="space-y-3">
      {/* Forward / back / override — all one form, one shared note */}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="ticketId" value={ticketId} />
        <FormError state={state} />
        <div className="space-y-2">
          <Label htmlFor="note">
            Note for customer{" "}
            <span className="text-muted-foreground">(optional)</span>
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
              {STEP_TITLE_OVERRIDE[currentStatus] ?? `Mark as ${doneLabel(next)}`}
            </span>
            {STEP_DESCRIPTION[currentStatus] ? (
              <span className="text-xs font-normal opacity-80">
                {STEP_DESCRIPTION[currentStatus]}
              </span>
            ) : null}
          </Button>
        ) : (
          <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
            {currentStatus === "CANCELLED"
              ? "This repair is cancelled — use the override below to reopen it."
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
            Go back to {doneLabel(prev)}
          </Button>
        ) : null}

        {!showOverride ? (
          <button
            type="button"
            onClick={() => setShowOverride(true)}
            className="flex w-full items-center justify-center gap-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Need to skip a step?
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

      {/* Cancel — available at any live step, with a required reason */}
      {!terminal ? <CancelRepairForm ticketId={ticketId} /> : null}
    </div>
  );
}

// Cancel is its own form (separate note) so its reason never mixes with
// the forward-step note. A repair can be cancelled at any point before
// pickup — customer changed their mind, unrepairable, too costly, etc.
function CancelRepairForm({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateTicketStatus, null);
  useSuccessToast(state, "Repair cancelled — customer notified.");

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Ban className="size-3.5" /> Cancel this repair
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="status" value="CANCELLED" />
      <FormError state={state} />
      <Label htmlFor="cancel-note" className="text-sm font-medium text-destructive">
        Reason for cancellation
      </Label>
      <Textarea
        id="cancel-note"
        name="note"
        rows={3}
        required
        placeholder="e.g. Customer decided not to proceed — repair cost too high. Shown to the customer and on the bill."
        className="resize-none bg-background"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Ban className="size-3.5" />
          )}
          Confirm cancellation
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Keep repair
        </Button>
      </div>
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

// Curate the notes that print on the customer's bill. Pre-seeded with the
// diagnosis and cancellation notes (the two the shop almost always wants),
// with one-tap chips to drop in any other timeline note, plus free typing.
export function BillNotesForm({
  ticketId,
  billNotes,
  suggestions,
}: {
  ticketId: string;
  billNotes: string | null;
  suggestions: { label: string; text: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateBillNotes, null);
  const [value, setValue] = useState(billNotes ?? "");
  useSuccessToast(state, "Bill notes saved.");

  const insert = (text: string) => {
    setValue((cur) => (cur.trim() ? `${cur.trim()}\n${text}` : text));
  };

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <FormError state={state} />
      {suggestions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Tap to add to the bill:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => insert(s.text)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="size-3" /> {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <Textarea
        name="billNotes"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Notes shown to the customer on the bill — e.g. the diagnosis, or why the repair was cancelled. Leave empty to show none."
        className="resize-none"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save bill notes
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
