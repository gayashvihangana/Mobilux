"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, TriangleAlert, Undo2 } from "lucide-react";
import type { RepairIssueStatus, TicketStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  respondRepairIssue,
  type TicketFormState,
} from "@/lib/actions/tickets";
import { cn } from "@/lib/utils";

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
  const [state, formAction, pending] = useActionState(respondRepairIssue, null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const last = useRef<TicketFormState>(null);
  useEffect(() => {
    if (state !== last.current && state?.error) toast.error(state.error);
    last.current = state;
  }, [state]);

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

        <form action={formAction} className="space-y-2">
          <input type="hidden" name="ticketId" value={ticketId} />
          {hasFix ? (
            <>
              <Button
                type="submit"
                name="decision"
                value="accept"
                className="w-full"
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Accept — fix it free of charge
              </Button>
              {confirmingDecline ? (
                <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs text-destructive">
                    This cancels the repair — you&apos;ll get your device back
                    unrepaired, with a refund for the damage. Sure?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      name="decision"
                      value="decline"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                    >
                      {pending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      Yes, cancel &amp; refund me
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDecline(false)}
                    >
                      <Undo2 className="size-3.5" /> Keep the repair
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDecline(true)}
                  className={cn(
                    "w-full text-destructive hover:bg-destructive/10 hover:text-destructive",
                  )}
                >
                  Decline — cancel with a refund
                </Button>
              )}
            </>
          ) : (
            <Button
              type="submit"
              name="decision"
              value="decline"
              variant="destructive"
              className="w-full"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <TriangleAlert className="size-4" />
              )}
              Accept cancellation &amp; refund
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
