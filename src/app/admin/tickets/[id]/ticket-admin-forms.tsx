"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Link2,
  Loader2,
  Package,
  Plus,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
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
  reportRepairIssue,
  respondRepairIssue,
  undoRepairIssueDecision,
  withdrawRepairIssue,
  updateBillNotes,
  updateIssueParts,
  updateTicketDetails,
  updateTicketStatus,
  type TicketFormState,
} from "@/lib/actions/tickets";
import {
  ISSUE_REPORTABLE_STATUSES,
  type IssueSummary,
  type IssueWithParts,
} from "@/lib/repair-issue";
import { PartsEditor } from "@/components/forms/parts-editor";
import type { PartEntry } from "@/lib/parts";
import { cn, formatDateTime, formatLKR } from "@/lib/utils";
import {
  DEVICE_TYPES,
  doneLabel,
  nextStatus,
  prevStatus,
  STATUS_PIPELINE,
} from "@/lib/status";
import { RECEIVED_ITEM_PRESETS } from "@/lib/received-items";
import { FormAutosave } from "@/components/forms/form-autosave";

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
  IN_PROGRESS: "Repair finished and tested — the customer can come and collect.",
  COMPLETED: "Device handed back to the customer.",
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

        {/* Optional handover photo — offered on the pickup step. */}
        {next === "PICKED_UP" ? (
          <div className="space-y-2">
            <Label htmlFor="photo">
              Handover photo{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              A photo of the collected device or signed slip — shown on the
              customer&apos;s timeline.
            </p>
          </div>
        ) : null}

        {next === "RECEIVED" ? (
          // Receiving a device asks what came in with it, so it opens a
          // dialog (its own form) instead of submitting straight away.
          <MarkReceivedDialog ticketId={ticketId} />
        ) : next ? (
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
          <div className="space-y-1">
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
            {/* Going back rewinds rather than appends, so the admin is
                deleting history — say so before they click, not after. */}
            <p className="text-center text-[11px] text-muted-foreground">
              Rewinds the timeline: the steps after {doneLabel(prev)} are
              deleted, notes and all. The customer isn&apos;t notified.
            </p>
          </div>
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
            <p className="text-[11px] text-muted-foreground">
              Jumping forward adds a step. Jumping back rewinds — everything
              after that step is deleted from the timeline.
            </p>
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

// One row in the Mark-as-Received dialog — a preset (Phone, SIM card…) the
// admin ticks on/off, or a custom item they added themselves.
type ReceivedDraft = {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  placeholder?: string;
  custom?: boolean;
};

// "Mark as Received" opens this instead of submitting directly: the shop
// records exactly what the customer handed over (phone, back cover, SIM,
// tempered glass…) with a short detail per item (SIM operator, cover
// colour…). Items are saved on the ticket and, when no custom note is
// written, become the timeline note the customer sees.
function MarkReceivedDialog({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateTicketStatus, null);
  useSuccessToast(state, "Marked as Received — items logged.");

  const [items, setItems] = useState<ReceivedDraft[]>(() =>
    RECEIVED_ITEM_PRESETS.map((preset, index) => ({
      id: `preset-${index}`,
      label: preset.label,
      detail: "",
      // The device itself is always part of a repair drop-off.
      checked: preset.label === "Phone",
      placeholder: preset.placeholder,
    })),
  );

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  const setItem = (id: string, patch: Partial<ReceivedDraft>) =>
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addCustom = () =>
    setItems((cur) => [
      ...cur,
      {
        id: `custom-${Date.now()}`,
        label: "",
        detail: "",
        checked: true,
        custom: true,
      },
    ]);

  const removeCustom = (id: string) =>
    setItems((cur) => cur.filter((i) => i.id !== id));

  const selected = items.filter((i) => i.checked && i.label.trim());
  const itemsJson = JSON.stringify(
    selected.map((i) => ({ label: i.label.trim(), detail: i.detail.trim() })),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="h-auto w-full flex-col items-start gap-0.5 py-3 text-left whitespace-normal"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Inbox className="size-4" /> Mark as Received
          </span>
          <span className="text-xs font-normal opacity-80">
            The device has arrived — log what came in with it.
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="status" value="RECEIVED" />
          <input type="hidden" name="receivedItemsJson" value={itemsJson} />
          <DialogHeader>
            <DialogTitle>What did you receive?</DialogTitle>
            <DialogDescription>
              Tick everything the customer handed over. A short detail (SIM
              operator, cover colour…) avoids mix-ups at pickup.
            </DialogDescription>
          </DialogHeader>
          <FormError state={state} />

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id={`item-${item.id}`}
                    checked={item.checked}
                    onChange={(e) => setItem(item.id, { checked: e.target.checked })}
                    className="size-4 shrink-0 accent-primary"
                  />
                  {item.custom ? (
                    <Input
                      value={item.label}
                      onChange={(e) => setItem(item.id, { label: e.target.value })}
                      placeholder="Item name, e.g. Memory card"
                      className="h-8 flex-1 text-sm"
                      autoFocus
                    />
                  ) : (
                    <label
                      htmlFor={`item-${item.id}`}
                      className="flex-1 cursor-pointer text-sm font-medium"
                    >
                      {item.label}
                    </label>
                  )}
                  {item.custom ? (
                    <button
                      type="button"
                      onClick={() => removeCustom(item.id)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
                {item.checked ? (
                  <Input
                    value={item.detail}
                    onChange={(e) => setItem(item.id, { detail: e.target.value })}
                    placeholder={item.placeholder ?? "Detail (optional)"}
                    maxLength={120}
                    className="mt-2 h-8 text-sm"
                  />
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addCustom}
              className="w-full text-muted-foreground"
            >
              <Plus className="size-3.5" /> Add another item
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="received-note">
              Note for customer{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="received-note"
              name="note"
              rows={2}
              placeholder="Leave empty to list the received items automatically."
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || selected.length === 0}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Mark as Received
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  parts: PartEntry[];
  /** What fixing our own mistakes on this repair cost — read-only here. */
  issuePartsCost: number;
  adminNotes: string | null;
  forgottenParts: string | null;
};

export function TicketDetailsForm({ values }: { values: TicketDetailsValues }) {
  const [state, formAction, pending] = useActionState(updateTicketDetails, null);
  useSuccessToast(state, "Repair details saved.");

  // Live sum of the parts rows, so the read-only parts cost tracks what's
  // being typed instead of waiting for the save.
  const [partsTotal, setPartsTotal] = useState(() =>
    values.parts.reduce((sum, p) => sum + (p.cost ?? 0), 0),
  );
  // A repair logged before per-part costs existed keeps its hand-typed total
  // until costs are entered below — the save follows the same rule.
  const derivedPartsCost = partsTotal + values.issuePartsCost;
  const legacyPartsCost = values.partsCost ? Number(values.partsCost) : 0;
  const usingLegacy = derivedPartsCost === 0 && legacyPartsCost > 0;
  const autoPartsCost = usingLegacy ? legacyPartsCost : derivedPartsCost;

  return (
    <form action={formAction} className="space-y-4">
      <FormAutosave
        storageKey={`ticket-details-${values.ticketId}`}
        signal={state}
      />
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
          {/* Auto-computed — the sum of the part costs below plus anything the
              shop had to buy to fix its own mistakes. Read-only so the two can
              never drift apart. */}
          <div
            id="partsCost"
            className="flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm"
          >
            <span className="font-medium tabular-nums transition-colors">
              {formatLKR(autoPartsCost)}
            </span>
            <span className="text-xs text-muted-foreground">
              {usingLegacy ? "kept" : "auto"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {usingLegacy
              ? "Earlier hand-entered total — add part costs below to take over."
              : `Parts below ${formatLKR(partsTotal)}${
                  values.issuePartsCost > 0
                    ? ` + issue fixes ${formatLKR(values.issuePartsCost)}`
                    : ""
                }`}
          </p>
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
      </div>

      <PartsEditor initial={values.parts} onTotalChange={setPartsTotal} />

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

// ── Issue during repair (damage/dispute) ─────────────────────────

// "Report an issue" — something went wrong at the shop (cracked glass,
// bent frame…). The report goes straight to the customer with either a
// free-of-charge fix to accept, or — when no fix is possible — an offer
// to cancel with a refund for the damage.
function ReportIssueDialog({
  ticketId,
  another = false,
}: {
  ticketId: string;
  /** A previous issue has already been resolved on this repair. */
  another?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reportRepairIssue, null);
  useSuccessToast(state, "Issue reported — customer notified.");

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {another ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
          >
            <TriangleAlert className="size-3.5" /> Report another issue
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full flex-col items-start gap-0.5 border-warning/40 py-3 text-left whitespace-normal hover:bg-warning/10"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
              <TriangleAlert className="size-4" /> Report an issue
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              The device was harmed or damaged while at the shop.
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticketId} />
          <DialogHeader>
            <DialogTitle>Report an issue to the customer</DialogTitle>
            <DialogDescription>
              Be honest and specific — the customer sees exactly what you write
              here and decides how to proceed.
            </DialogDescription>
          </DialogHeader>
          <FormError state={state} />
          <div className="space-y-2">
            <Label htmlFor="issue-note">What happened</Label>
            <Textarea
              id="issue-note"
              name="note"
              rows={3}
              required
              placeholder="e.g. While opening the device, the back glass cracked."
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-solution">
              The fix you&apos;ll do free of charge{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="issue-solution"
              name="solution"
              rows={3}
              placeholder="e.g. We'll replace the back glass with a new original panel at no cost."
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if there&apos;s no way to fix it — the customer will
              be offered a cancellation with a refund for the damage instead.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <TriangleAlert className="size-4" />
              )}
              Send to customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Record the customer's decision on their behalf — walk-ins and phone
// calls have no account to respond from.
function RecordIssueDecision({
  issueId,
  hasFix,
}: {
  issueId: string;
  hasFix: boolean;
}) {
  const [state, formAction, pending] = useActionState(respondRepairIssue, null);
  useSuccessToast(state, "Decision recorded.");

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="issueId" value={issueId} />
      <FormError state={state} />
      <p className="text-xs text-muted-foreground">
        Customer told you their decision in person? Record it here:
      </p>
      <div className="flex flex-wrap gap-2">
        {hasFix ? (
          <Button
            type="submit"
            name="decision"
            value="accept"
            variant="secondary"
            size="sm"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Accepted the free fix
          </Button>
        ) : null}
        <Button
          type="submit"
          name="decision"
          value="decline"
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Cancel &amp; refund
        </Button>
      </div>
    </form>
  );
}

// Take back an issue the customer hasn't answered yet — reported in error,
// or settled face to face. The report is deleted outright, so it also
// disappears from the timeline.
function WithdrawIssue({ issueId }: { issueId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    withdrawRepairIssue,
    null,
  );
  useSuccessToast(state, "Issue withdrawn — customer notified.");

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Undo2 className="size-3.5" /> Undo this issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="issueId" value={issueId} />
          <DialogHeader>
            <DialogTitle>Withdraw this issue?</DialogTitle>
            <DialogDescription>
              The report is deleted and disappears from the customer&apos;s
              timeline, along with the decision you asked them for. The repair
              carries on as if it was never raised.
            </DialogDescription>
          </DialogHeader>
          <FormError state={state} />
          <p className="text-xs text-muted-foreground">
            They&apos;ll be told the issue was withdrawn — they may already have
            seen it and be worrying. What you wrote can&apos;t be recovered.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Undo2 className="size-4" />
              )}
              Withdraw issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Reverse a decision recorded by mistake. Sends the choice back to the
// customer; undoing a cancellation also reopens the repair.
function UndoIssueDecision({
  issueId,
  declined,
}: {
  issueId: string;
  declined: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    undoRepairIssueDecision,
    null,
  );
  useSuccessToast(state, "Decision undone — back to the customer.");

  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="issueId" value={issueId} />
      <FormError state={state} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Undo2 className="size-3.5" />
        )}
        Undo this decision
      </Button>
      <p className="text-xs text-muted-foreground">
        {declined
          ? "Reopens the repair at the step it was cancelled from and puts the choice back to the customer."
          : "Puts the choice back to the customer."}
      </p>
    </form>
  );
}

// What the shop had to buy to put its own mistake right. Collapsed by default
// so the panel stays about the customer's decision; the total is on the
// summary line so the cost is visible without opening it.
function IssueCostForm({ issue }: { issue: IssueWithParts }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateIssueParts, null);
  useSuccessToast(state, "Issue costs saved.");

  const [total, setTotal] = useState(() =>
    issue.parts.reduce((sum, p) => sum + (p.cost ?? 0), 0),
  );

  return (
    <div className="rounded-xl border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/40"
      >
        <span className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <span className="font-medium">What this cost us</span>
          <span className="text-xs text-muted-foreground">
            {issue.parts.length > 0
              ? `${issue.parts.length} part${issue.parts.length === 1 ? "" : "s"} · ${formatLKR(total)}`
              : "nothing recorded"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <form action={formAction} className="space-y-3 border-t border-border p-3">
            <input type="hidden" name="issueId" value={issue.id} />
            <FormError state={state} />
            <PartsEditor
              initial={issue.parts}
              label="Parts bought to fix it"
              addLabel="Add part"
              hint="Replacement parts we paid for because of this issue, with supplier and price. Adds to the repair's parts cost and the error reports — never shown on the customer's bill."
              onTotalChange={setTotal}
            />
            <Button type="submit" variant="secondary" size="sm" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save issue costs
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// The whole issue section on the admin ticket page: the report button while
// nothing is wrong, then the live state of the dispute once reported.
// One reported issue with whatever action it currently allows.
function IssueEntry({
  issue,
  index,
  total,
}: {
  issue: IssueWithParts;
  index: number;
  total: number;
}) {
  const label = total > 1 ? `Issue ${index + 1} of ${total}` : "Issue";

  if (issue.status === "PENDING") {
    return (
      <div className="space-y-3">
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-warning">
              Waiting for the customer&apos;s decision
            </p>
            <p className="text-xs text-muted-foreground">
              {label} · {formatDateTime(issue.reportedAt)}
            </p>
          </div>
          <p className="whitespace-pre-wrap">{issue.note}</p>
          {issue.solution ? (
            <p className="text-muted-foreground">
              Offered fix (free of charge): {issue.solution}
            </p>
          ) : (
            <p className="text-muted-foreground">
              No fix possible — the customer was offered a cancellation with a
              refund for the damage.
            </p>
          )}
        </div>
        <IssueCostForm issue={issue} />
        <RecordIssueDecision issueId={issue.id} hasFix={!!issue.solution} />
        <WithdrawIssue issueId={issue.id} />
      </div>
    );
  }

  if (issue.status === "ACCEPTED") {
    return (
      <div className="space-y-2">
        <div className="space-y-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-success">
              Customer accepted — fix free of charge, repair continues.
            </p>
            <p className="text-xs text-muted-foreground">
              {label} · {formatDateTime(issue.reportedAt)}
            </p>
          </div>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {issue.note}
          </p>
          {issue.solution ? (
            <p className="text-muted-foreground">Agreed fix: {issue.solution}</p>
          ) : null}
        </div>
        <IssueCostForm issue={issue} />
        <UndoIssueDecision issueId={issue.id} declined={false} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-destructive">
            Repair cancelled over this issue — refund the customer.
          </p>
          <p className="text-xs text-muted-foreground">
            {label} · {formatDateTime(issue.reportedAt)}
          </p>
        </div>
        <p className="whitespace-pre-wrap text-muted-foreground">{issue.note}</p>
      </div>
      <IssueCostForm issue={issue} />
      <UndoIssueDecision issueId={issue.id} declined />
    </div>
  );
}

export function RepairIssuePanel({
  ticketId,
  status,
  issues,
}: {
  ticketId: string;
  status: TicketStatus;
  issues: IssueWithParts[];
}) {
  const pending = issues.some((i) => i.status === "PENDING");
  const cancelledOver = issues.some((i) => i.status === "DECLINED");
  const canReport = ISSUE_REPORTABLE_STATUSES.includes(status);

  if (issues.length === 0) {
    if (!canReport) {
      return (
        <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          Issues can be reported while the device is at the shop.
        </p>
      );
    }
    return <ReportIssueDialog ticketId={ticketId} />;
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => (
        <IssueEntry
          key={issue.id}
          issue={issue}
          index={index}
          total={issues.length}
        />
      ))}

      {/* Another mishap can happen after the first was settled — as long as
          nothing is awaiting the customer and the device is still here. */}
      {pending ? (
        <p className="text-xs text-muted-foreground">
          Settle this issue before reporting another.
        </p>
      ) : cancelledOver ? (
        <p className="text-xs text-muted-foreground">
          This repair was cancelled — undo the decision above to reopen it.
        </p>
      ) : canReport ? (
        <ReportIssueDialog ticketId={ticketId} another />
      ) : (
        <p className="text-xs text-muted-foreground">
          Issues can be reported while the device is at the shop.
        </p>
      )}
    </div>
  );
}
