import { cn } from "@virzeen/ui";
import { Star } from "lucide-react";

const STARS = [1, 2, 3, 4, 5];

/** "4.3" or "4": one decimal only when there is one. */
export const formatRating = (rating: number) => String(Math.round(rating * 10) / 10);

/** Five stars, the first `filled` in ink, the rest as outlines. Decorative: give the meaning in text beside it. */
export function Stars({ filled, className }: { filled: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-0.5", className)}>
      {STARS.map((n) => (
        <Star
          key={n}
          strokeWidth={1.5}
          className={cn("size-4", n <= filled ? "fill-current text-ink" : "text-line-strong")}
        />
      ))}
    </span>
  );
}

/** A rating as stars (rounded to whole stars) that screen readers hear as "Rated 4.3 out of 5" (specs/reviews.md). */
export function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Rated ${formatRating(rating)} out of 5`}
      className={cn("inline-flex", className)}
    >
      <Stars filled={Math.round(rating)} />
    </span>
  );
}
