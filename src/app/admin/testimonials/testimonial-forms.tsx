"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Pin,
  Plus,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/forms/field-error";
import { MESSAGE_MAX } from "@/lib/testimonials";
import {
  createTestimonial,
  deleteTestimonial,
  moveTestimonial,
  setTestimonialStatus,
  setTestimonialsVisibility,
  toggleTestimonialFeatured,
  updateTestimonial,
  type TestimonialFormState,
} from "@/lib/actions/testimonials";
import { cn } from "@/lib/utils";

export type TestimonialRow = {
  id: string;
  name: string;
  deviceLabel: string | null;
  rating: number;
  message: string;
  adminNote: string | null;
  status: "PENDING" | "APPROVED" | "HIDDEN";
  featured: boolean;
};

function useFormToast(
  state: TestimonialFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<TestimonialFormState>(null);
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

// Star picker for the admin dialogs — same interaction as the customer form,
// scaled down to sit inside a dialog.
function StarPicker({ defaultValue = 0 }: { defaultValue?: number }) {
  const [rating, setRating] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      <input type="hidden" name="rating" value={rating || ""} />
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(star)}
          onClick={() => setRating(star)}
          className={cn(
            "rounded p-0.5 transition-transform duration-200 ease-out hover:scale-115",
            star <= shown && "scale-110",
          )}
        >
          <Star
            className={cn(
              "size-6 transition-colors duration-200",
              star <= shown
                ? "fill-warning text-warning"
                : "text-muted-foreground/35",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function TestimonialDialog({ row }: { row?: TestimonialRow }) {
  const [open, setOpen] = useState(false);
  const editing = !!row;
  const [state, formAction, pending] = useActionState(
    editing ? updateTestimonial : createTestimonial,
    null,
  );
  useFormToast(state, editing ? "Feedback updated." : "Feedback published.", () =>
    setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit feedback</span>
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Add feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={row.id} /> : null}
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit feedback" : "Add feedback"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Fix typos or trim the wording — the customer's meaning should stay intact."
                : "Type in what a walk-in customer told you. It publishes straight away."}
            </DialogDescription>
          </DialogHeader>

          {state?.error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Rating</Label>
            <StarPicker defaultValue={row?.rating} />
            <FieldError errors={state?.fieldErrors?.rating} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={row?.name ?? ""}
                placeholder="e.g. Nuwan P."
                maxLength={60}
                required
              />
              <FieldError errors={state?.fieldErrors?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceLabel">Caption</Label>
              <Input
                id="deviceLabel"
                name="deviceLabel"
                defaultValue={row?.deviceLabel ?? ""}
                placeholder="e.g. iPhone 13 · Screen replacement"
                maxLength={120}
              />
              <FieldError errors={state?.fieldErrors?.deviceLabel} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Feedback</Label>
            <Textarea
              id="message"
              name="message"
              defaultValue={row?.message ?? ""}
              rows={5}
              maxLength={MESSAGE_MAX}
              required
              className="resize-none"
            />
            <FieldError errors={state?.fieldErrors?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminNote">Internal note (optional)</Label>
            <Input
              id="adminNote"
              name="adminNote"
              defaultValue={row?.adminNote ?? ""}
              placeholder="Never shown on the site"
              maxLength={300}
            />
            <FieldError errors={state?.fieldErrors?.adminNote} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Publish feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Publish / take down. Pending feedback gets a prominent Publish button;
// once live it flips to a quieter Hide.
export function StatusButtons({ row }: { row: TestimonialRow }) {
  const [pending, startTransition] = useTransition();

  const run = (status: TestimonialRow["status"], message: string) =>
    startTransition(async () => {
      const result = await setTestimonialStatus(row.id, status);
      if (result?.error) toast.error(result.error);
      else toast.success(message);
    });

  return (
    <div className="flex items-center gap-1.5">
      {row.status === "APPROVED" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run("HIDDEN", "Feedback hidden from the site.")}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <EyeOff className="size-4" />
          )}
          Hide
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run("APPROVED", "Feedback published.")}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Eye className="size-4" />
          )}
          Publish
        </Button>
      )}
      {row.status === "PENDING" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run("HIDDEN", "Feedback declined.")}
        >
          Decline
        </Button>
      ) : null}
    </div>
  );
}

export function FeaturedToggle({ row }: { row: TestimonialRow }) {
  const [pending, startTransition] = useTransition();
  const [featured, setFeatured] = useState(row.featured);

  return (
    <button
      type="button"
      disabled={pending || row.status !== "APPROVED"}
      title={
        row.status === "APPROVED"
          ? "Pin to the front of the home-page rail"
          : "Publish the feedback first"
      }
      onClick={() => {
        const next = !featured;
        setFeatured(next);
        startTransition(async () => {
          const result = await toggleTestimonialFeatured(row.id, next);
          if (result?.error) {
            setFeatured(!next);
            toast.error(result.error);
          } else {
            toast.success(next ? "Pinned to the front." : "Unpinned.");
          }
        });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        featured
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <Pin
        className={cn(
          "size-3.5 transition-transform duration-300",
          featured && "-rotate-45 fill-primary",
        )}
      />
      {featured ? "Pinned" : "Pin"}
    </button>
  );
}

export function ReorderButtons({
  id,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const move = (direction: "up" | "down") =>
    startTransition(async () => {
      const result = await moveTestimonial(id, direction);
      if (result?.error) toast.error(result.error);
    });

  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        disabled={pending || !canMoveUp}
        onClick={() => move("up")}
      >
        <ChevronUp className="size-4" />
        <span className="sr-only">Move up</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        disabled={pending || !canMoveDown}
        onClick={() => move("down")}
      >
        <ChevronDown className="size-4" />
        <span className="sr-only">Move down</span>
      </Button>
    </div>
  );
}

export function DeleteTestimonialButton({ row }: { row: TestimonialRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteTestimonial, null);
  useFormToast(state, "Feedback deleted.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={row.id} />
          <DialogHeader>
            <DialogTitle>Delete {row.name}&apos;s feedback?</DialogTitle>
            <DialogDescription>
              This removes it for good. If you only want it off the site, hide
              it instead — you can publish it again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SectionVisibilityToggle({ initial }: { initial: boolean }) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(initial);

  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
      <Switch
        checked={checked}
        disabled={pending}
        onCheckedChange={(value) => {
          setChecked(value);
          startTransition(async () => {
            const result = await setTestimonialsVisibility(value);
            if (result?.error) {
              setChecked(!value);
              toast.error(result.error);
            } else {
              toast.success(
                value
                  ? "Testimonials section is visible on the home page."
                  : "Testimonials section hidden from the home page.",
              );
            }
          });
        }}
      />
      <span className="text-sm font-medium whitespace-nowrap">
        Show on home page
      </span>
    </label>
  );
}
