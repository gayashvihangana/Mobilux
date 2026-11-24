"use client";

import { useActionState, useRef, useState } from "react";
import { ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/forms/field-error";
import { FormAutosave } from "@/components/forms/form-autosave";
import { PartsEditor } from "@/components/forms/parts-editor";
import { adminCreateTicket } from "@/lib/actions/tickets";
import { DEVICE_TYPES, STATUS_PIPELINE, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { DeviceFields } from "@/components/forms/device-fields";
import { CustomerFields } from "@/components/forms/customer-fields";

// Fields that render their own error message below.
const SHOWN_FIELDS = new Set([
  "customerName",
  "customerPhone",
  "issueTitle",
  "estimatedCost",
  "receivedAt",
]);

// Steps a repair can be entered at. Online-request steps (Submitted,
// Confirmed) are for repairs booked on the website, not ones in the shop.
const STEPS = STATUS_PIPELINE.filter((s) => s !== "SUBMITTED" && s !== "CONFIRMED");
const DONE: TicketStatus[] = ["COMPLETED", "READY_FOR_PICKUP", "PICKED_UP"];

/** Today and yesterday in Colombo, as YYYY-MM-DD. */
function colomboDay(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Booking a device in: who, what it is, what is wrong and the day it came
// in (today, or earlier when it is entered late). "More details" holds the
// step and, for a repair that is already finished, the finished date, price,
// payment, parts and notes, so an old repair is entered with the same form.
// `compact` is the short version on the Today screen.
export function QuickRepairForm({
  compact = false,
  problems = [],
  openDetails = false,
}: {
  compact?: boolean;
  /** One-tap problems, from Settings > Repairs. */
  problems?: string[];
  /** Start with More details open (old "Add a past repair" links). */
  openDetails?: boolean;
}) {
  const [state, formAction, pending] = useActionState(adminCreateTicket, null);
  const problemRef = useRef<HTMLInputElement>(null);
  // Two copies of this form can be on screen at once (the Today card and a
  // dialog), so ids are prefixed to keep each label tied to its own input.
  const id = (name: string) => `${compact ? "quick" : "new"}-${name}`;

  const today = colomboDay();
  const yesterday = colomboDay(-1);
  const [deviceType, setDeviceType] = useState("PHONE");
  const [received, setReceived] = useState(today);
  const [picking, setPicking] = useState(false);
  const [moreOpen, setMoreOpen] = useState(openDetails);
  const [status, setStatus] = useState<TicketStatus>("RECEIVED");
  const finished = DONE.includes(status);

  // The save action validates the full schema. An error on a field this form
  // does not show would otherwise fail the save without a word.
  const hiddenFieldError = Object.keys(state?.fieldErrors ?? {}).some(
    (field) => !SHOWN_FIELDS.has(field),
  );
  const message =
    state?.error ??
    (hiddenFieldError ? "The repair could not be saved. Try again." : null);

  const chip = (on: boolean) =>
    cn(
      "inline-flex h-10 items-center rounded-full px-4 text-sm font-bold transition-colors",
      on ? "bg-ink text-ink-foreground" : "bg-secondary hover:bg-accent",
    );

  return (
    <form action={formAction} className={cn(compact ? "space-y-3" : "space-y-5")}>
      <FormAutosave
        storageKey={compact ? "quick-repair" : "new-repair-admin"}
        signal={state}
      />
      <input type="hidden" name="deviceType" value={compact ? "PHONE" : deviceType} />
      <input type="hidden" name="status" value={compact ? "RECEIVED" : status} />
      <input type="hidden" name="receivedAt" value={compact ? "" : received} />

      {message ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" />
          {message}
        </div>
      ) : null}

      <CustomerFields
        name={{
          id: id("customerName"),
          placeholder: compact ? "Customer name" : "Type a name or pick a customer",
          invalid: !!state?.fieldErrors?.customerName,
        }}
        phone={{
          id: id("customerPhone"),
          placeholder: compact ? "Phone (optional)" : "07X XXX XXXX",
          invalid: !!state?.fieldErrors?.customerPhone,
        }}
      >
        {(fields) => (
          <div className={cn("grid gap-3", !compact && "gap-5 sm:grid-cols-2")}>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={id("customerName")} className={cn(compact && "sr-only")}>
                Customer
              </Label>
              {fields.customer}
              <FieldError errors={state?.fieldErrors?.customerName} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={id("customerPhone")} className={cn(compact && "sr-only")}>
                Phone number <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              {fields.phone}
              <FieldError errors={state?.fieldErrors?.customerPhone} />
            </div>
          </div>
        )}
      </CustomerFields>

      {compact ? null : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Device type</legend>
          <div className="flex flex-wrap gap-2">
            {DEVICE_TYPES.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={deviceType === d.value}
                onClick={() => setDeviceType(d.value)}
                className={chip(deviceType === d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <DeviceFields
        brand={{ id: id("brand"), placeholder: compact ? "Brand" : "Type or pick, e.g. Samsung" }}
        model={{ id: id("model"), placeholder: compact ? "Model" : "e.g. Galaxy A32" }}
      >
        {(fields) => (
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={id("brand")} className={cn(compact && "sr-only")}>
                Brand
              </Label>
              {fields.brand}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={id("model")} className={cn(compact && "sr-only")}>
                Model
              </Label>
              {fields.model}
            </div>
          </div>
        )}
      </DeviceFields>

      <div className="space-y-2">
        <Label htmlFor={id("issueTitle")} className={cn(compact && "sr-only")}>
          Problem
        </Label>
        <Input
          ref={problemRef}
          id={id("issueTitle")}
          name="issueTitle"
          required
          minLength={3}
          autoComplete="off"
          placeholder={compact ? "Problem" : "e.g. No power after water damage"}
        />
        <FieldError errors={state?.fieldErrors?.issueTitle} />
        {compact || problems.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            {problems.map((problem) => (
              <Button
                key={problem}
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => {
                  if (problemRef.current) {
                    problemRef.current.value = problem;
                    problemRef.current.focus();
                  }
                }}
              >
                {problem}
              </Button>
            ))}
          </div>
        )}
      </div>

      {compact ? null : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={id("estimatedCost")}>
                Quoted price (LKR) <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id={id("estimatedCost")}
                name="estimatedCost"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                placeholder="Add after diagnosis"
              />
              <FieldError errors={state?.fieldErrors?.estimatedCost} />
            </div>

            {/* The day it came in: a repair entered late keeps its real date. */}
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium">Received</legend>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={!picking && received === today}
                  onClick={() => {
                    setPicking(false);
                    setReceived(today);
                  }}
                  className={chip(!picking && received === today)}
                >
                  Today
                </button>
                <button
                  type="button"
                  aria-pressed={!picking && received === yesterday}
                  onClick={() => {
                    setPicking(false);
                    setReceived(yesterday);
                  }}
                  className={chip(!picking && received === yesterday)}
                >
                  Yesterday
                </button>
                {picking ? (
                  <Input
                    id={id("receivedAt")}
                    type="date"
                    aria-label="Day the device came in"
                    max={today}
                    value={received}
                    onChange={(e) => setReceived(e.target.value || today)}
                    className="h-10 w-auto"
                    autoFocus
                  />
                ) : (
                  <button type="button" onClick={() => setPicking(true)} className={chip(false)}>
                    Pick a date
                  </button>
                )}
              </div>
              <FieldError errors={state?.fieldErrors?.receivedAt} />
            </fieldset>
          </div>

          {/* More details: step, and everything for a finished repair */}
          <div className="rounded-2xl bg-secondary/50">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left"
            >
              <span>
                <span className="font-bold">More details</span>
                <span className="block text-xs text-muted-foreground">
                  {moreOpen
                    ? "Step, notes and parts. For a finished repair, its price and payment."
                    : status === "RECEIVED"
                      ? "Step: Received. Open to add notes, parts or an already finished repair."
                      : `Step: ${statusLabel(status)}`}
                </span>
              </span>
              <ChevronDown className={cn("size-5 shrink-0 transition-transform", moreOpen && "rotate-180")} />
            </button>

            {moreOpen ? (
              <div className="space-y-5 px-4 pb-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={id("status")}>Step</Label>
                    <select
                      id={id("status")}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TicketStatus)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold"
                    >
                      {STEPS.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {finished ? (
                    <div className="space-y-1.5">
                      <Label htmlFor={id("completedAt")}>Finished on</Label>
                      <Input
                        id={id("completedAt")}
                        name="completedAt"
                        type="date"
                        min={received}
                        max={today}
                        defaultValue={received}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={id("issueDescription")}>
                    Problem details <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea id={id("issueDescription")} name="issueDescription" rows={2} className="resize-none" />
                </div>

                {finished ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor={id("solution")}>
                        Work done <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id={id("solution")}
                        name="solution"
                        rows={2}
                        placeholder="e.g. Display replaced"
                        className="resize-none"
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={id("finalCost")}>Final price (LKR)</Label>
                        <Input id={id("finalCost")} name="finalCost" type="number" min="0" step="0.01" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={id("paidAmount")}>Customer paid (LKR)</Label>
                        <Input id={id("paidAmount")} name="paidAmount" type="number" min="0" step="0.01" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={id("duration")}>
                          Time taken <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Input id={id("duration")} name="duration" placeholder="e.g. 2 hours" />
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Parts <span className="font-normal text-muted-foreground">(shop only, never shown to customers)</span>
                  </p>
                  <PartsEditor initial={[]} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={id("adminNotes")}>
                      Private notes <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id={id("adminNotes")}
                      name="adminNotes"
                      rows={2}
                      placeholder="Anything worth remembering"
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={id("forgottenParts")}>
                      Left behind <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input id={id("forgottenParts")} name="forgottenParts" placeholder="e.g. 3 screws" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      <Button
        type="submit"
        variant="ink"
        size="lg"
        className={cn("w-full", !compact && "sm:w-auto sm:px-8")}
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Saving…" : "Save repair"}
      </Button>
    </form>
  );
}
