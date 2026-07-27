"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import type { RepairIssueStatus, TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  respondRepairIssue,
  type TicketFormState,
} from "@/lib/actions/tickets";

// The customer's side of the issue-during-repair flow. While a report is
// pending they decide right here: accept the free fix (repair continues at
// no charge) or decline and cancel with a refund for the damage. Afterwards
// the card stays as a quiet record of what was agreed.
export function RepairIssueCard({
  ticketId,
  ticketStatus,
  issue,
}: {
  ticketId: string;
  ticketStatus: TicketStatus;
  issue: {
    status: RepairIssueStatus;
    note: string | null;
    solution: string | null;
  };
}) {
  // Accept and decline are separate forms: the decline button lives inside a
  // confirmation dialog, which Radix portals outside the card's DOM.
  const [acceptState, acceptAction, accepting] = useActionState(
    respondRepairIssue,
    null,
  );
  const [declineState, declineAction, declining] = useActionState(
    respondRepairIssue,
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lastAccept = useRef<TicketFormState>(null);
  const lastDecline = useRef<TicketFormState>(null);
  useEffect(() => {
    if (acceptState !== lastAccept.current && acceptState?.error) {
      toast.error(acceptState.error);
    }
    lastAccept.current = acceptState;
  }, [acceptState]);
  useEffect(() => {
    if (declineState !== lastDecline.current) {
      if (declineState?.error) toast.error(declineState.error);
      else if (declineState?.success) setConfirmOpen(false);
    }
    lastDecline.current = declineState;
  }, [declineState]);

  const hasFix = !!issue.solution;

  if (issue.status === "ACCEPTED") {
    const done = ticketStatus === "PICKED_UP";
    return (
      <Card className="border-success/40 bg-success/5">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg text-success">
            <CheckCircle2 className="size-5" />
            {done
              ? "An issue occurred and was fixed free of charge"
              : "We're fixing the issue — free of charge"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="whitespace-pre-wrap text-muted-foreground">{issue.note}</p>
          {issue.solution ? (
            <p>
              <span className="font-medium">Agreed fix:</span> {issue.solution}
            </p>
          ) : null}
          {!done ? (
            <p className="text-muted-foreground">
              No extra cost to you — thank you for your patience.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (issue.status === "DECLINED") {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg text-destructive">
            <TriangleAlert className="size-5" /> Repair cancelled — refund agreed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="whitespace-pre-wrap text-muted-foreground">{issue.note}</p>
          <p>
            We&apos;re sorry about this. A refund for the damage was agreed —
            contact us if you have any questions.
          </p>
        </CardContent>
      </Card>
    );
  }

  // PENDING — the decision is the customer's to make.
  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg text-warning">
          <TriangleAlert className="size-5" /> An issue happened during your
          repair — your decision needed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            What happened
          </p>
          <p className="mt-1 whitespace-pre-wrap">{issue.note}</p>
        </div>

        {hasFix ? (
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Our proposed fix — free of charge
            </p>
            <p className="mt-1 whitespace-pre-wrap">{issue.solution}</p>
          </div>
        ) : (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            Unfortunately there is no way to fix this. We&apos;re sorry — if you
            accept, we&apos;ll cancel the repair and refund you for the damage.
          </p>
        )}

        <div className="space-y-2">
          {hasFix ? (
            <form action={acceptAction}>
              <input type="hidden" name="ticketId" value={ticketId} />
              <input type="hidden" name="decision" value="accept" />
              <Button type="submit" className="w-full" disabled={accepting}>
                {accepting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Accept — fix it free of charge
              </Button>
            </form>
          ) : null}

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              {hasFix ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Decline — cancel the repair and refund me
                </Button>
              ) : (
                <Button type="button" variant="destructive" className="w-full">
                  <TriangleAlert className="size-4" />
                  Accept cancellation &amp; refund
                </Button>
              )}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Cancel the repair and receive a refund?
                </DialogTitle>
                <DialogDescription>
                  Please read this carefully — once you confirm, this decision
                  is final and cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>All work on your device will stop immediately.</li>
                <li>Your device will not be repaired any further.</li>
                <li>
                  We will carefully reassemble it and hand it back to you as
                  soon as that is finished.
                </li>
                <li>You will receive a refund for the damage.</li>
              </ul>
              <form action={declineAction}>
                <input type="hidden" name="ticketId" value={ticketId} />
                <input type="hidden" name="decision" value="decline" />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmOpen(false)}
                  >
                    {hasFix ? "Keep the repair" : "Go back"}
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={declining}
                  >
                    {declining ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <TriangleAlert className="size-4" />
                    )}
                    Yes, cancel and refund me
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
