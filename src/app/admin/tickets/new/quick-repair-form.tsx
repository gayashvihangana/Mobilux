"use client";

import { useActionState, useRef } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { FormAutosave } from "@/components/forms/form-autosave";
import { adminCreateTicket } from "@/lib/actions/tickets";
import { cn } from "@/lib/utils";

// The problems that walk in most often — one tap fills the field.
const COMMON_PROBLEMS = [
  "Display cracked",
  "No power",
  "Not charging",
  "Battery drain",
];

// Fields that render their own error message below.
const SHOWN_FIELDS = new Set([
  "customerName",
  "customerPhone",
  "issueTitle",
  "estimatedCost",
]);

// Booking a device in at the counter: who, how to reach them, what it is and
// what is wrong. Everything else (parts, costs, notes) is added on the repair
// page once the work starts. The repair is always saved as RECEIVED — logging
// an old, finished repair is a different job with its own form.
export function QuickRepairForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, pending] = useActionState(adminCreateTicket, null);
  const problemRef = useRef<HTMLInputElement>(null);
  // Two copies of this form can be on screen at once (the Today card and a
  // dialog), so ids are prefixed to keep each label tied to its own input.
  const id = (name: string) => `${compact ? "quick" : "new"}-${name}`;

  // The save action validates the long form's schema. An error on a field
  // this form does not show would otherwise fail the save without a word.
  const hiddenFieldError = Object.keys(state?.fieldErrors ?? {}).some(
    (field) => !SHOWN_FIELDS.has(field),
  );
  const message =
    state?.error ??
    (hiddenFieldError ? "The repair could not be saved. Try again." : null);

  return (
    <form action={formAction} className={cn(compact ? "space-y-3" : "space-y-5")}>
      <FormAutosave
        storageKey={compact ? "quick-repair" : "new-repair-admin"}
        signal={state}
      />
      <input type="hidden" name="customerId" value="none" />
      <input type="hidden" name="deviceType" value="PHONE" />
      <input type="hidden" name="status" value="RECEIVED" />

      {message ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" />
          {message}
        </div>
      ) : null}

      <div className={cn("grid gap-3", !compact && "gap-5 sm:grid-cols-2")}>
        <div className="space-y-1.5">
          <Label htmlFor={id("customerName")} className={cn(compact && "sr-only")}>
            Customer name
          </Label>
          <Input
            id={id("customerName")}
            name="customerName"
            required
            autoComplete="off"
            placeholder={compact ? "Customer name" : "e.g. Nimal Perera"}
          />
          <FieldError errors={state?.fieldErrors?.customerName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("customerPhone")} className={cn(compact && "sr-only")}>
            Phone number
          </Label>
          <Input
            id={id("customerPhone")}
            name="customerPhone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="off"
            placeholder={compact ? "Phone number" : "07X XXX XXXX"}
          />
          <FieldError errors={state?.fieldErrors?.customerPhone} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={id("brand")} className={cn(compact && "sr-only")}>
            Brand
          </Label>
          <Input
            id={id("brand")}
            name="brand"
            autoComplete="off"
            placeholder={compact ? "Brand" : "e.g. Samsung"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("model")} className={cn(compact && "sr-only")}>
            Model
          </Label>
          <Input
            id={id("model")}
            name="model"
            autoComplete="off"
            placeholder={compact ? "Model" : "e.g. Galaxy A32"}
          />
        </div>
      </div>

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
        {compact ? null : (
          <div className="flex flex-wrap gap-2">
            {COMMON_PROBLEMS.map((problem) => (
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
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor={id("estimatedCost")}>
            Quoted price (LKR){" "}
            <span className="text-muted-foreground">(optional)</span>
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
