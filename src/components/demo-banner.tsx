import { FlaskConical } from "lucide-react";

// Site-wide — rendered once from the root layout, which is why this shows on
// both the customer site and /admin: there's a single insertion point rather
// than one per layout. Resets every night; nothing typed here survives.
export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground sm:text-sm">
      <FlaskConical className="size-3.5 shrink-0" />
      <span>
        You&apos;re viewing a demo — nothing here is real, and it resets every
        night.
      </span>
    </div>
  );
}
