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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { moveTicket, undoTicketMove } from "@/lib/actions/tickets";
import { NEXT_STEP_ACTION, nextStatus, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

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

// Moves a repair to its next step. One tap for most steps, followed by a
// message with Undo (status changes reach the customer, so a slip has to be
// easy to take back). "Send price" asks for the price and whether a part is
// needed first. Online requests (Submitted, Confirmed) need more than a tap,
// so they link to the repair page instead.
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
  /** Prefills "Send price". */
  estimatedCost?: number | null;
  tone?: Tone;
  size?: "default" | "lg";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [priceOpen, setPriceOpen] = useState(false);
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

  const move = (to: TicketStatus, price?: number) =>
    startTransition(async () => {
      const result = await moveTicket({ ticketId, status: to, estimatedCost: price });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPriceOpen(false);
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
        <SendPriceDialog
          open={priceOpen}
          onOpenChange={setPriceOpen}
          deviceName={deviceName}
          estimatedCost={estimatedCost}
          pending={pending}
          onSend={(price, needsPart) =>
            move(needsPart ? "AWAITING_PARTS" : "IN_PROGRESS", price)
          }
        />
      </>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={buttonClass}
      disabled={pending}
      onClick={() => move(next)}
    >
      {pending ? <Loader2 className="animate-spin" /> : null}
      {label}
    </Button>
  );
}

function SendPriceDialog({
  open,
  onOpenChange,
  deviceName,
  estimatedCost,
  pending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  estimatedCost?: number | null;
  pending: boolean;
  onSend: (price: number, needsPart: boolean) => void;
}) {
  const [price, setPrice] = useState(
    estimatedCost != null ? String(Math.round(estimatedCost)) : "",
  );
  const value = Number(price);
  const valid = price.trim() !== "" && Number.isFinite(value) && value >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            // Enter in the price box means the common case: no part needed.
            if (valid) onSend(value, false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Price for the {deviceName}</DialogTitle>
            <DialogDescription>
              Saved as the price quoted to the customer. Then pick what
              happens next.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`price-${deviceName}`}>Price (LKR)</Label>
            <Input
              id={`price-${deviceName}`}
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              autoFocus
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="e.g. 6500"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={!valid || pending}
              onClick={() => onSend(value, true)}
            >
              Needs a part
            </Button>
            <Button type="submit" size="lg" disabled={!valid || pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              No part, start repair
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
