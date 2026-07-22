"use client";

import { useActionState } from "react";
import { ImagePlus, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { FieldError } from "@/components/forms/field-error";
import { FormAutosave } from "@/components/forms/form-autosave";
import { createTicket } from "@/lib/actions/tickets";
import { DEVICE_TYPES } from "@/lib/status";

export function NewRepairForm() {
  const [state, formAction, pending] = useActionState(createTicket, null);

  return (
    <form action={formAction} className="space-y-6">
      <FormAutosave storageKey="new-repair" signal={state} />
      {state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="deviceType">Device type</Label>
          <Select name="deviceType" defaultValue="PHONE">
            <SelectTrigger id="deviceType" className="h-11 w-full">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={state?.fieldErrors?.deviceType} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            name="brand"
            placeholder="e.g. Apple, Samsung"
            required
            className="h-11"
          />
          <FieldError errors={state?.fieldErrors?.brand} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            name="model"
            placeholder="e.g. iPhone 14 Pro"
            required
            className="h-11"
          />
          <FieldError errors={state?.fieldErrors?.model} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issueTitle">What&apos;s wrong? (short title)</Label>
        <Input
          id="issueTitle"
          name="issueTitle"
          placeholder="e.g. Cracked screen, phone won't charge"
          required
          className="h-11"
        />
        <FieldError errors={state?.fieldErrors?.issueTitle} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issueDescription">Describe the issue</Label>
        <Textarea
          id="issueDescription"
          name="issueDescription"
          placeholder="When did it start? Does the device turn on? Any drops or water contact? The more detail, the faster our diagnosis."
          required
          rows={5}
          className="resize-none"
        />
        <FieldError errors={state?.fieldErrors?.issueDescription} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photos" className="flex items-center gap-2">
          <ImagePlus className="size-4 text-muted-foreground" />
          Photos <span className="text-muted-foreground">(optional, up to 4)</span>
        </Label>
        <Input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="h-11 cursor-pointer pt-2.5 file:text-primary"
        />
        <p className="text-xs text-muted-foreground">
          JPG, PNG or WebP — max 5 MB each. Photos of the damage help us quote
          faster.
        </p>
      </div>

      <Button type="submit" size="lg" className="h-12 w-full sm:w-auto sm:px-8" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Submitting…" : "Submit repair request"}
      </Button>
    </form>
  );
}
