import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

// Reads like a personal notebook entry — lessons/mistakes the shop owner
// wrote for themselves, not a data field. Never shown to customers.
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
        "relative rounded-2xl border border-warning/25 bg-warning/[0.04] p-5 pl-6",
        className,
      )}
    >
      <span className="absolute top-0 left-0 h-full w-1 rounded-l-2xl bg-warning/40" />
      <div className="flex items-start gap-3">
        <NotebookPen className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-[0.95rem] leading-[1.75] whitespace-pre-wrap text-foreground/90">
          {text}
        </p>
      </div>
    </div>
  );
}
