import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "size-3.5",
  default: "size-4",
  lg: "size-5",
} as const;

// Read-only star row. The filled stars carry a tiny staggered pop-in so
// cards feel alive as they scroll into view; reduced-motion users get the
// static row (the animation utility is a no-op for them).
export function StarRating({
  rating,
  size = "default",
  animate = false,
  className,
}: {
  rating: number;
  size?: keyof typeof SIZE_CLASS;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        return (
          <Star
            key={star}
            aria-hidden
            className={cn(
              SIZE_CLASS[size],
              filled
                ? "fill-warning text-warning"
                : "text-muted-foreground/30",
              animate && filled && "animate-star-pop",
            )}
            style={
              animate && filled
                ? { animationDelay: `${star * 70}ms` }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
