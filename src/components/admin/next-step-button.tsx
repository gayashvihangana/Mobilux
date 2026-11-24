"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { moveTicket, undoTicketMove } from "@/lib/actions/tickets";
import { defaultStepNote, NEXT_STEP_ACTION, nextStatus, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { PartEntry } from "@/lib/parts";
import {
  DIAGNOSED_DEFAULT,
  DiagnosedDialog,
  MarkReadyDialog,
  PartArrivedDialog,
} from "@/components/admin/step-dialogs";

type Tone = "primary" | "secondary" | "ink" | "onPrimary";

const TONE: Record<Tone, { variant: "default" | "secondary" | "ink"; className?: string }> = {
  primary: { variant: "default" },
  secondary: { variant: "secondary" },
  ink: { variant: "ink" },
  // White button on the blue header card.
  onPrimary: {
    variant: "default",
    className: "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
  },
};

// Moves a repair to its next step. Each button opens a small window with a
// comment, filled in with the step's usual message: keep it, or write what
// was found or done. Confirming moves the repair on, followed by a message
// with Undo (status changes reach the customer, so a slip has to be easy to
// take back). Three steps ask for more (see step-dialogs.tsx): Diagnosed
// (what was found, parts needed, an optional price), Part arrived (what each
// part cost) and Mark ready (the final price, worked out from the costs).
// Online requests (Submitted, Confirmed) need more than a tap, so they link
// to the repair page instead.
export function NextStepButton({
  ticketId,
  status,
  deviceName,
  estimatedCost,
  tone = "secondary",
  size = "default",
  className,
}: {
  ticketId: string;
  status: TicketStatus;
  /** Names the repair in the confirmation message. */
  deviceName: string;
  /** Kept for callers; the Diagnosed window reads the quote itself. */
  estimatedCost?: number | null;
  tone?: Tone;
  size?: "default" | "lg";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [priceOpen, setPriceOpen] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const label = NEXT_STEP_ACTION[status];
  const next = nextStatus(status);
  const { variant, className: toneClass } = TONE[tone];
  const buttonClass = cn(toneClass, className);

  if (!label || !next) return null;

  if (status === "SUBMITTED" || status === "CONFIRMED") {
    return (
      <Button asChild variant={variant} size={size} className={buttonClass}>
        <Link href={`/admin/tickets/${ticketId}`}>{label}</Link>
      </Button>
    );
  }

  const move = (
    to: TicketStatus,
    price?: number,
    comment?: string,
    extra: {
      parts?: PartEntry[];
      finalCost?: number;
      billItems?: { label: string; qty: number; unitPrice: number }[];
      diagnosis?: string;
    } = {},
  ) =>
    startTransition(async () => {
      // Left as the ready-made message: send nothing, so the customer gets
      // the same message as always (for "ready", that includes where and
      // when to collect, and the amount).
      const note = comment?.trim() && comment.trim() !== defaultStepNote(to) ? comment : undefined;
      const result = await moveTicket({ ticketId, status: to, estimatedCost: price, note, ...extra });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPriceOpen(false);
      setStepOpen(false);
      const from = result.from;
      toast.success(`${deviceName}: ${statusLabel(to)}`, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undone = await undoTicketMove({ ticketId, to: from });
            if (undone.ok) toast(`${deviceName}: back to ${statusLabel(from)}`);
            else toast.error(undone.error);
          },
        },
      });
    });

  if (status === "DIAGNOSING") {
    return (
      <>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={buttonClass}
          onClick={() => setPriceOpen(true)}
        >
          {label}
        </Button>
        <DiagnosedDialog
          open={priceOpen}
          onOpenChange={setPriceOpen}
          ticketId={ticketId}
          deviceName={deviceName}
          pending={pending}
          onSave={(r) =>
            move(r.needsParts ? "AWAITING_PARTS" : "IN_PROGRESS", r.price, undefined, {
              diagnosis: r.comment.trim() || DIAGNOSED_DEFAULT,
              ...(r.parts ? { parts: r.parts } : {}),
            })
          }
        />
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={buttonClass}
        disabled={pending}
        onClick={() => setStepOpen(true)}
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {label}
      </Button>
      {status === "AWAITING_PARTS" ? (
        <PartArrivedDialog
          open={stepOpen}
          onOpenChange={setStepOpen}
          ticketId={ticketId}
          deviceName={deviceName}
          pending={pending}
          defaultComment={defaultStepNote(next)}
          onSave={(r) => move(next, undefined, r.comment, { parts: r.parts })}
        />
      ) : status === "IN_PROGRESS" ? (
        <MarkReadyDialog
          open={stepOpen}
          onOpenChange={setStepOpen}
          ticketId={ticketId}
          deviceName={deviceName}
          pending={pending}
          defaultComment={defaultStepNote(next)}
          onSave={(r) =>
            move(next, undefined, r.comment, {
              ...(r.finalCost !== undefined ? { finalCost: r.finalCost, billItems: r.billItems } : {}),
            })
          }
        />
      ) : (
        <StepDialog
          open={stepOpen}
          onOpenChange={setStepOpen}
          deviceName={deviceName}
          action={label}
          to={next}
          pending={pending}
          onConfirm={(comment) => move(next, undefined, comment)}
        />
      )}
    </>
  );
}

// The window behind every step button: a comment filled in with the step's
// usual message, and the button again to confirm.
function StepDialog({
  open,
  onOpenChange,
  deviceName,
  action,
  to,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  action: string;
  to: TicketStatus;
  pending: boolean;
  onConfirm: (comment: string) => void;
}) {
  const fallback = defaultStepNote(to);
  const [comment, setComment] = useState(fallback);
  const fieldId = `step-${to}-${deviceName}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Each time it opens, start from the ready-made message.
        if (o) setComment(fallback);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(comment);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {action}: {deviceName}
            </DialogTitle>
            <DialogDescription>
              Moves the repair to {statusLabel(to)}. The comment goes on the
              repair&apos;s timeline and to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor={fieldId}>Comment</Label>
              {comment !== fallback ? (
                <button
                  type="button"
                  onClick={() => setComment(fallback)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Use the usual message
                </button>
              ) : null}
            </div>
            <Textarea
              id={fieldId}
              rows={3}
              maxLength={500}
              autoFocus
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {action}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
