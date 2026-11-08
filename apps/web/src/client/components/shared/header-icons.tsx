import { cn } from "@virzeen/ui";

// The header's Favourites and Bag icons (owner request 2026-11-08, Nike-style): an outline heart with round lobes,
// and a bag with its handle that holds the item count. Decorative: the buttons carry the names.

type IconProps = { className?: string };

/** Outline heart: two round lobes meeting in a dip, down to a point. */
export function HeartIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-6", className)}
    >
      <path d="M12 20.25 4.21 12.46a4.97 4.97 0 0 1 7.03-7.03l.76.76.76-.76a4.97 4.97 0 0 1 7.03 7.03Z" />
    </svg>
  );
}

/** A bag with a handle; `count` (1 and up) sits inside it, "9+" past 9. Empty bags show no number. */
export function BagIcon({ count, className }: IconProps & { count: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-6", className)}
    >
      <path d="M8.25 7.5v-.75a3.75 3.75 0 0 1 7.5 0v.75" strokeLinecap="round" />
      <path d="M4.5 7.5h15v11.25a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25Z" />
      {count > 0 && (
        <text
          x="12"
          y="17.6"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontSize={count > 9 ? 7 : 8.5}
          fontWeight={500}
          className="tabular-nums"
        >
          {count > 9 ? "9+" : count}
        </text>
      )}
    </svg>
  );
}
