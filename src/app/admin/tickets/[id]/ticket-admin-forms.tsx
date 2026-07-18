"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, TriangleAlert } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
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
import {
  updateTicketCosts,
  updateTicketStatus,
  type TicketFormState,
} from "@/lib/actions/tickets";
import { STATUS_META } from "@/lib/status";

function useSuccessToast(state: TicketFormState, message: string) {
  const last = useRef<TicketFormState>(null);
  useEffect(() => {
    if (state !== last.current && state?.success) {
      toast.success(message);
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
  useSuccessToast(state, "Status updated — the customer has been notified.");

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

export function CostsForm({
  ticketId,
  estimatedCost,
  finalCost,
  adminNotes,
}: {
  ticketId: string;
  estimatedCost: string | null;
  finalCost: string | null;
  adminNotes: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateTicketCosts, null);
  useSuccessToast(state, "Costs saved.");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="estimatedCost">Estimated (LKR)</Label>
          <Input
            id="estimatedCost"
            name="estimatedCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={estimatedCost ?? ""}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finalCost">Final (LKR)</Label>
          <Input
            id="finalCost"
            name="finalCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={finalCost ?? ""}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminNotes">
          Internal notes <span className="text-muted-foreground">(not shown to customer)</span>
        </Label>
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={3}
          defaultValue={adminNotes ?? ""}
          placeholder="Parts ordered, supplier, serials…"
          className="resize-none"
        />
      </div>
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Saving…" : "Save costs & notes"}
      </Button>
    </form>
  );
}
