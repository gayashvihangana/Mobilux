import { cn } from "@/lib/utils";

// A plain phone outline, standing in until repairs carry their own photo.
export function PhoneGlyph({
  className,
  body = "fill-ink",
  screen = "fill-card",
}: {
  className?: string;
  body?: string;
  screen?: string;
}) {
  return (
    <svg viewBox="0 0 40 72" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect x="2" y="2" width="36" height="68" rx="8" className={body} />
      <rect x="6" y="6" width="28" height="60" rx="5" className={screen} />
      <rect x="15" y="9" width="10" height="3" rx="1.5" className={body} />
    </svg>
  );
}
