"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Ban,
  Ellipsis,
  ExternalLink,
  ListChecks,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NextStepButton } from "@/components/admin/next-step-button";
import { undoTicketMove } from "@/lib/actions/tickets";
import { NEXT_STEP_ACTION, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  CancelRepairDialog,
  DeleteTicketDialog,
  MarkReceivedDialog,
  StatusUpdateForm,
} from "./ticket-admin-forms";

const TERMINAL: TicketStatus[] = ["PICKED_UP", "CANCELLED"];

// The repair's one main action. Most steps are the same one-tap button as
// the Board; receiving a device asks what came in with it, and an online
// request is accepted in its own card further down.
export function MainAction({
  ticketId,
  status,
  deviceName,
  estimatedCost,
  tone,
  className,
}: {
  ticketId: string;
  status: TicketStatus;
  deviceName: string;
  estimatedCost: number | null;
  tone: "onPrimary" | "primary";
  className?: string;
}) {
  const label = NEXT_STEP_ACTION[status];
  if (!label || TERMINAL.includes(status)) return null;
  const toneClass =
    tone === "onPrimary"
      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
      : undefined;

  if (status === "SUBMITTED") {
    return (
      <Button asChild size="lg" className={cn(toneClass, className)}>
        <a href="#accept">{label}</a>
      </Button>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <MarkReceivedDialog
        ticketId={ticketId}
        trigger={
          <Button type="button" size="lg" className={cn(toneClass, className)}>
            {label}
          </Button>
        }
      />
    );
  }
  return (
    <NextStepButton
      ticketId={ticketId}
      status={status}
      deviceName={deviceName}
      estimatedCost={estimatedCost}
      tone={tone}
      size="lg"
      className={className}
    />
  );
}

// "⋯": everything that is not the main action — edit, add a note or skip a
// step, go back a step, cancel and delete — kept out of the way so the
// screen has one obvious button.
export function RepairMenu({
  ticketId,
  ticketNumber,
  status,
  previous,
  deviceName,
  className,
}: {
  ticketId: string;
  ticketNumber: string;
  status: TicketStatus;
  /** The step the repair was at before this one, from its timeline. */
  previous: TicketStatus | null;
  deviceName: string;
  className?: string;
}) {
  const [dialog, setDialog] = useState<
    null | "status" | "back" | "cancel" | "delete"
  >(null);
  const [pending, startTransition] = useTransition();
  const prev = status === "CANCELLED" ? null : previous;
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const goBack = () =>
    startTransition(async () => {
      if (!prev) return;
      const result = await undoTicketMove({ ticketId, to: prev });
      if (result.ok) {
        toast.success(`${deviceName}: back to ${statusLabel(prev)}`);
        setDialog(null);
      } else {
        toast.error(result.error);
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-lg" className={className} aria-label="More actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem asChild className="min-h-11">
            <Link href={`/admin/tickets/${ticketId}?edit=1#edit`}>
              <Pencil /> Edit repair details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => setDialog("status")}>
            <ListChecks /> Change status or add a note
          </DropdownMenuItem>
          {prev ? (
            <DropdownMenuItem className="min-h-11" onSelect={() => setDialog("back")}>
              <Undo2 /> Go back to {statusLabel(prev)}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild className="min-h-11">
            <Link href={`/bill/${ticketId}`} target="_blank">
              <ExternalLink /> View bill
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {TERMINAL.includes(status) ? null : (
            <DropdownMenuItem
              className="min-h-11 text-destructive focus:text-destructive"
              onSelect={() => setDialog("cancel")}
            >
              <Ban className="text-destructive" /> Cancel repair
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="min-h-11 text-destructive focus:text-destructive"
            onSelect={() => setDialog("delete")}
          >
            <Trash2 className="text-destructive" /> Delete repair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "status"} onOpenChange={close}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Move on with a note for the customer, skip a step, or go back.
            </DialogDescription>
          </DialogHeader>
          <StatusUpdateForm ticketId={ticketId} currentStatus={status} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "back"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Go back to {prev ? statusLabel(prev) : ""}?</DialogTitle>
            <DialogDescription>
              The &ldquo;{statusLabel(status)}&rdquo; step and its note are
              removed from the timeline. The customer is not sent a message.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button type="button" onClick={goBack} disabled={pending}>
              <Undo2 /> Go back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CancelRepairDialog
        ticketId={ticketId}
        open={dialog === "cancel"}
        onOpenChange={close}
      />
      <DeleteTicketDialog
        ticketId={ticketId}
        ticketNumber={ticketNumber}
        open={dialog === "delete"}
        onOpenChange={close}
      />
    </>
  );
}
