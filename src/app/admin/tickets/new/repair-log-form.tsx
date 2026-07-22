"use client";

import { useActionState, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/forms/field-error";
import { FormAutosave } from "@/components/forms/form-autosave";
import { adminCreateTicket } from "@/lib/actions/tickets";
import { DEVICE_TYPES, doneLabel, STATUS_PIPELINE } from "@/lib/status";

export type CustomerOption = { id: string; name: string; email: string };

export function RepairLogForm({ customers }: { customers: CustomerOption[] }) {
  const [state, formAction, pending] = useActionState(adminCreateTicket, null);
  const [customerId, setCustomerId] = useState("none");

  return (
    <form action={formAction} className="space-y-6">
      <FormAutosave storageKey="admin-new-ticket" signal={state} />
      {state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      {/* Customer */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer account</Label>
          <Select
            name="customerId"
            value={customerId}
            onValueChange={setCustomerId}
          >
            <SelectTrigger id="customerId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No account (walk-in)</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerName">
            Customer name{" "}
            {customerId === "none" ? (
              ""
            ) : (
              <span className="text-muted-foreground">(optional)</span>
            )}
          </Label>
          <Input
            id="customerName"
            name="customerName"
            placeholder="e.g. Priyantha Bappa"
          />
          <FieldError errors={state?.fieldErrors?.customerName} />
        </div>
      </div>

      <Separator />

      {/* Device */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="deviceType">Device type</Label>
          <Select name="deviceType" defaultValue="PHONE">
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
          <Label htmlFor="brand">
            Brand <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="brand" name="brand" placeholder="e.g. Samsung" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">
            Model <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="model" name="model" placeholder="e.g. Galaxy A12" />
        </div>
      </div>

      {/* Issue & solution */}
      <div className="space-y-2">
        <Label htmlFor="issueTitle">Issue</Label>
        <Input
          id="issueTitle"
          name="issueTitle"
          placeholder="e.g. Display Cracked"
          required
        />
        <FieldError errors={state?.fieldErrors?.issueTitle} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issueDescription">
            Issue details <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="issueDescription"
            name="issueDescription"
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="solution">
            Solution <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="solution"
            name="solution"
            rows={3}
            placeholder="e.g. Display Replacement"
            className="resize-none"
          />
        </div>
      </div>

      {/* Status & dates */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue="PICKED_UP">
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_PIPELINE
                // Submitted/Confirmed only apply to online requests that
                // haven't physically arrived — a manual shop log starts
                // from the device being in hand.
                .filter((value) => value !== "SUBMITTED" && value !== "CONFIRMED")
                .map((value) => (
                  <SelectItem key={value} value={value}>
                    {doneLabel(value)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="completedAt">
            Date completed <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="completedAt" name="completedAt" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">
            Duration <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="duration" name="duration" placeholder="e.g. 2 Hours" />
        </div>
      </div>

      <Separator />

      {/* Money & parts — internal */}
      <p className="text-sm font-medium text-muted-foreground">
        Shop bookkeeping (never shown to customers)
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="partsCost">Parts cost (LKR)</Label>
          <Input
            id="partsCost"
            name="partsCost"
            type="number"
            min="0"
            step="0.01"
            placeholder="What the shop spent"
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
            placeholder="What the customer paid"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partsUsed">Parts used</Label>
          <Input id="partsUsed" name="partsUsed" placeholder="e.g. Display, Battery" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partsSupplier">Parts supplier</Label>
          <Input
            id="partsSupplier"
            name="partsSupplier"
            placeholder="e.g. Trans Asia Cellular"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="forgottenParts">Forgotten parts</Label>
          <Input
            id="forgottenParts"
            name="forgottenParts"
            placeholder="e.g. 3 Screws"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimatedCost">
            Quoted price (LKR){" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="estimatedCost"
            name="estimatedCost"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminNotes">
          Notes & lessons{" "}
          <span className="text-muted-foreground">
            (private — mistakes, advice to yourself, things learned)
          </span>
        </Label>
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={4}
          placeholder="What went wrong, what you'd do differently, anything worth remembering…"
          className="resize-none"
        />
      </div>

      <Button type="submit" size="lg" className="h-12 w-full sm:w-auto sm:px-8" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Saving…" : "Save repair log"}
      </Button>
    </form>
  );
}
