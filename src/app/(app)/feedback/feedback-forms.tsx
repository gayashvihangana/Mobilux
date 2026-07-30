"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MessageSquareQuote,
  Send,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/forms/field-error";
import { FormAutosave } from "@/components/forms/form-autosave";
import { MESSAGE_MAX, MESSAGE_MIN } from "@/lib/testimonials";
import {
  submitTestimonial,
  withdrawTestimonial,
  type TestimonialFormState,
} from "@/lib/actions/testimonials";
import { cn } from "@/lib/utils";

const RATING_COPY: Record<number, string> = {
  1: "Not good — tell us what went wrong",
  2: "Below what you expected",
  3: "Did the job",
  4: "Happy with it",
  5: "Loved it — you'd recommend us",
};

export type ReviewableTicket = {
  id: string;
  label: string;
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

// Star picker — hover previews the score, the label underneath narrates it,
// and the chosen stars keep a gentle scale so the choice reads at a glance.
function StarPicker({ error }: { error?: boolean }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <div className="space-y-2">
      <input type="hidden" name="rating" value={rating || ""} />
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label="Rating"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= shown;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(0)}
              onClick={() => setRating(star)}
              className={cn(
                "rounded-lg p-1 transition-transform duration-200 ease-out outline-none",
                "hover:scale-115 focus-visible:ring-2 focus-visible:ring-ring",
                active && "scale-110",
              )}
            >
              <Star
                className={cn(
                  "size-8 transition-colors duration-200 sm:size-9",
                  active
                    ? "fill-warning text-warning drop-shadow-[0_0_10px_var(--warning)]"
                    : cn(
                        "text-muted-foreground/35",
                        error && "text-destructive/50",
                      ),
                )}
              />
            </button>
          );
        })}
      </div>
      <p
        className={cn(
          "h-5 text-sm transition-all duration-200",
          shown
            ? "translate-y-0 text-foreground opacity-100"
            : "translate-y-1 text-muted-foreground opacity-70",
        )}
      >
        {shown ? RATING_COPY[shown] : "Tap a star to rate your experience"}
      </p>
    </div>
  );
}

export function FeedbackForm({
  defaultName,
  tickets,
  defaultTicketId,
}: {
  defaultName: string;
  tickets: ReviewableTicket[];
  defaultTicketId?: string;
}) {
  const [state, formAction, pending] = useActionState(submitTestimonial, null);
  const [chars, setChars] = useState(0);
  // Remount the fields after a successful submit so the stars and counter
  // reset with the rest of the form.
  const [formKey, setFormKey] = useState(0);
  useFormToast(
    state,
    "Thanks! Your feedback is with our team for review.",
    () => {
      setChars(0);
      setFormKey((k) => k + 1);
    },
  );

  const overLimit = chars > MESSAGE_MAX;

  return (
    <form action={formAction} className="space-y-6">
      <FormAutosave storageKey="feedback" signal={state} />

      {state?.error ? (
        <div className="animate-fade-up flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>How was your experience?</Label>
        <StarPicker key={formKey} error={!!state?.fieldErrors?.rating} />
        <FieldError errors={state?.fieldErrors?.rating} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Your feedback</Label>
        <Textarea
          key={formKey}
          id="message"
          name="message"
          rows={5}
          required
          placeholder="What did we fix, how did it go, and how did we treat you? Anything you'd tell a friend about the shop."
          className="resize-none"
          onChange={(e) => setChars(e.target.value.trim().length)}
        />
        <div className="flex items-center justify-between gap-3 text-xs">
          <FieldError errors={state?.fieldErrors?.message} />
          <span
            className={cn(
              "ml-auto tabular-nums transition-colors",
              overLimit
                ? "text-destructive"
                : chars >= MESSAGE_MIN
                  ? "text-success"
                  : "text-muted-foreground",
            )}
          >
            {chars}/{MESSAGE_MAX}
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Shown on the site as</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultName}
            maxLength={60}
            required
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Shorten it if you&apos;d rather not publish your full name.
          </p>
          <FieldError errors={state?.fieldErrors?.name} />
        </div>

        {tickets.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="ticketId">Which repair? (optional)</Label>
            <Select name="ticketId" defaultValue={defaultTicketId ?? "none"}>
              <SelectTrigger id="ticketId" className="h-11 w-full">
                <SelectValue placeholder="Pick a repair" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not about one repair</SelectItem>
                {tickets.map((ticket) => (
                  <SelectItem key={ticket.id} value={ticket.id}>
                    {ticket.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              We&apos;ll show the device and repair under your name.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          className="h-12 shadow-lg shadow-primary/20 sm:px-8"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {pending ? "Sending…" : "Send feedback"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Published on our home page once a team member reviews it.
        </p>
      </div>
    </form>
  );
}

export function WithdrawFeedbackButton({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    withdrawTestimonial,
    null,
  );
  useFormToast(state, "Feedback withdrawn.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" /> Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <DialogHeader>
            <DialogTitle>Withdraw this feedback?</DialogTitle>
            <DialogDescription>
              {published
                ? "It will be removed from our home page straight away. You're welcome to write new feedback afterwards."
                : "It won't be reviewed or published. You're welcome to write new feedback afterwards."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Withdraw
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Empty-state nudge shown when the customer has no feedback yet.
export function FeedbackEmptyHint() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
      <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>
        Nothing sent yet. Your review helps other people in Colombo find a
        repair shop they can trust.
      </p>
    </div>
  );
}
