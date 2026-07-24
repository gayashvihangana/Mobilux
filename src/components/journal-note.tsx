import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// A private note the shop owner wrote for themselves — lessons/mistakes,
// never shown to customers. Styled as a clean, quiet card so it reads as
// a calm aside rather than an alert.
export function JournalNote({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/30 p-4",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <Lock className="size-3" />
        Private note
      </div>
      <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap text-foreground/90">
        {text}
      </p>
    </div>
  );
}
