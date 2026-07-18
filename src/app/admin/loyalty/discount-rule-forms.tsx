"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldError } from "@/components/forms/field-error";
import {
  createDiscountRule,
  deleteDiscountRule,
  toggleDiscountRule,
  updateDiscountRule,
  type DiscountFormState,
} from "@/lib/actions/discounts";

export type DiscountRuleRow = {
  id: string;
  minRepairs: number;
  discountPercent: string;
  active: boolean;
};

function useFormToast(
  state: DiscountFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<DiscountFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) {
        toast.success(message);
        onSuccess?.();
      } else if (state?.error) {
        toast.error(state.error);
      }
    }
    last.current = state;
  }, [state, message, onSuccess]);
}

export function DiscountRuleDialog({ rule }: { rule?: DiscountRuleRow }) {
  const [open, setOpen] = useState(false);
  const editing = !!rule;
  const [state, formAction, pending] = useActionState(
    editing ? updateDiscountRule : createDiscountRule,
    null,
  );
  useFormToast(
    state,
    editing ? "Rule updated." : "Rule created.",
    () => setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit rule</span>
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> New rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={rule.id} /> : null}
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit discount rule" : "New discount rule"}
            </DialogTitle>
            <DialogDescription>
              Customers automatically get this discount once they reach the
              completed-repair count.
            </DialogDescription>
          </DialogHeader>

          {state?.error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minRepairs">From (completed repairs)</Label>
              <Input
                id="minRepairs"
                name="minRepairs"
                type="number"
                min="1"
                step="1"
                defaultValue={rule?.minRepairs ?? ""}
                placeholder="e.g. 3"
                required
              />
              <FieldError errors={state?.fieldErrors?.minRepairs} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Discount (%)</Label>
              <Input
                id="discountPercent"
                name="discountPercent"
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                defaultValue={rule ? rule.discountPercent : ""}
                placeholder="e.g. 5"
                required
              />
              <FieldError errors={state?.fieldErrors?.discountPercent} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="active" name="active" defaultChecked={rule?.active ?? true} />
            <Label htmlFor="active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RuleActiveToggle({ rule }: { rule: DiscountRuleRow }) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(rule.active);

  return (
    <Switch
      checked={checked}
      disabled={pending}
      onCheckedChange={(value) => {
        setChecked(value);
        startTransition(async () => {
          const result = await toggleDiscountRule(rule.id, value);
          if (result?.error) {
            setChecked(!value);
            toast.error(result.error);
          } else {
            toast.success(value ? "Rule activated." : "Rule deactivated.");
          }
        });
      }}
    />
  );
}

export function DeleteRuleButton({ rule }: { rule: DiscountRuleRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteDiscountRule, null);
  useFormToast(state, "Rule deleted.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete rule</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={rule.id} />
          <DialogHeader>
            <DialogTitle>
              Delete the {Number(rule.discountPercent)}% rule?
            </DialogTitle>
            <DialogDescription>
              Customers with {rule.minRepairs}+ completed repairs will stop
              receiving this discount on future repairs. Already-billed repairs
              are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete rule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
