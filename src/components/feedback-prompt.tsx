import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// Nudge shown on a finished repair the customer hasn't reviewed yet. The
// stars animate in one after another so it reads as an invitation rather
// than another status box.
export function FeedbackPrompt({ ticketId }: { ticketId: string }) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06] px-5 py-4">
      <div
        className="glow-primary absolute -top-16 -right-10 size-40 rounded-full blur-3xl"
        aria-hidden
      />
      <div className="relative min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="animate-star-pop size-4 fill-warning text-warning"
                style={{ animationDelay: `${star * 90}ms` }}
              />
            ))}
          </span>
          <p className="font-semibold">How did we do?</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Your repair is finished — a few words about it help other customers
          (and us).
        </p>
      </div>
      <Button asChild className="relative shrink-0">
        <Link href={`/feedback?ticket=${ticketId}`}>Leave feedback</Link>
      </Button>
    </div>
  );
}
