"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import type { StatusUpdate } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteStatusUpdate, updateStatusNote } from "@/lib/actions/tickets";
import { PendingRow } from "@/components/status-timeline";
import { doneLabel, milestoneDescription, STATUS_META } from "@/lib/status";
import type { TicketStatus } from "@prisma/client";
import { cn, formatDateTime } from "@/lib/utils";

function NoteEditor({
  update,
  onClose,
}: {
  update: StatusUpdate;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateStatusNote, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Note updated.");
      onClose();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onClose]);

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="updateId" value={update.id} />
      <Textarea
        name="note"
        rows={2}
        defaultValue={update.note ?? ""}
        placeholder={milestoneDescription(update.status)}
        className="resize-none text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteConfirm({
  update,
  onClose,
}: {
  update: StatusUpdate;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(deleteStatusUpdate, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Timeline entry deleted.");
      onClose();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onClose]);

  return (
    <form
      action={formAction}
      className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
    >
      <input type="hidden" name="updateId" value={update.id} />
      <p className="text-xs text-destructive">Delete this entry?</p>
      <div className="ml-auto flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Delete
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Same visual as StatusHistory, plus a pencil / trash on each entry so
// the shop can fix or remove what the customer sees on the timeline.
// Clearing the text reverts the entry to its default status description;
// deleting removes only the history entry, never the ticket's status.
export function EditableStatusHistory({
  updates,
  status,
}: {
  updates: StatusUpdate[];
  status?: TicketStatus;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const closeAll = () => {
    setEditingId(null);
    setDeletingId(null);
  };

  return (
    <ol className="space-y-0">
      {status ? <PendingRow status={status} /> : null}
      {updates.map((update, index) => {
        const meta = STATUS_META[update.status];
        const latest = index === 0;
        const editing = editingId === update.id;
        const deleting = deletingId === update.id;
        return (
          <li key={update.id} className="group relative flex gap-4 pb-6 last:pb-0">
            {index < updates.length - 1 ? (
              <span
                className="absolute top-5 left-[7px] h-full w-0.5 bg-border"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative mt-1 size-4 shrink-0 rounded-full border-2 border-background",
                meta.dotClassName,
                latest && "shadow-[0_0_10px]",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={cn("text-sm font-semibold", latest && "text-foreground")}>
                  {doneLabel(update.status)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(update.createdAt)}
                </p>
                {!editing && !deleting ? (
                  <span className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingId(null);
                        setEditingId(update.id);
                      }}
                      className="rounded-md p-1 text-muted-foreground opacity-60 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
                      aria-label={`Edit note for ${doneLabel(update.status)}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setDeletingId(update.id);
                      }}
                      className="rounded-md p-1 text-muted-foreground opacity-60 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      aria-label={`Delete ${doneLabel(update.status)} entry`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                ) : null}
              </div>
              {editing ? (
                <NoteEditor update={update} onClose={closeAll} />
              ) : deleting ? (
                <DeleteConfirm update={update} onClose={closeAll} />
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {update.note ?? milestoneDescription(update.status)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
