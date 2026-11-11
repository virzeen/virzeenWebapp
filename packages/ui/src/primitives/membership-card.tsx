import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const cardVariants = cva(
  "relative flex aspect-[1.586] w-full max-w-md flex-col justify-between overflow-hidden rounded-xl p-6",
  {
    variants: {
      level: {
        // The free MONO Member card: light grey with soft white circles.
        member: "border border-line bg-surface text-ink",
        // The Monochrome Pass: black, with dark spheres and a thin curved line, like a metal membership card.
        pass: "bg-ink text-canvas shadow-md",
      },
    },
    defaultVariants: { level: "member" },
  },
);

export type MembershipCardProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof cardVariants> & {
    /** The member's name, small, top left. */
    name: string;
    /** The level's name, set large in capitals and broken into lines at the spaces: "Monochrome Pass". */
    title: string;
    /** Bottom left, small: "Member since Nov 2026" or "Valid until 12 May 2027". */
    caption: string;
    /** The brand mark, bottom right (the page passes the Virzeen logo; it follows the text colour). */
    logo?: React.ReactNode;
  };

/**
 * The member's card at the top of the account (specs/membership-portal.md), laid out like a premium membership card:
 * the member's name small at the top, the level's name large in capitals, a caption and the brand mark at the bottom,
 * over soft circles and a thin curved line. `level="member"` is the light grey card of a free MONO Member;
 * `level="pass"` is the black Monochrome Pass card. Decorative text only: it holds no controls, and the page names
 * the level in a heading too.
 */
export function MembershipCard({
  level,
  name,
  title,
  caption,
  logo,
  className,
  ...props
}: MembershipCardProps) {
  const isPass = level === "pass";
  return (
    <div className={cn(cardVariants({ level }), className)} {...props}>
      {/* Decoration: two spheres bottom right and a thin arc across the card. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full border",
          isPass ? "border-canvas/10 bg-linear-to-br from-accent to-ink" : "border-line bg-canvas/60",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-24 bottom-8 size-20 rounded-full border",
          isPass ? "border-canvas/10 bg-linear-to-br from-ink-muted/40 to-ink" : "border-line bg-canvas/80",
        )}
      />
      <svg
        aria-hidden
        viewBox="0 0 100 63"
        preserveAspectRatio="none"
        className={cn(
          "pointer-events-none absolute inset-0 size-full",
          isPass ? "text-canvas/30" : "text-ink/15",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.3"
      >
        <path d="M0 52 C 30 58, 62 40, 100 6" />
      </svg>
      <p className={cn("relative text-small font-medium tracking-wide", isPass ? "text-canvas" : "text-ink")}>
        {name}
      </p>
      <h3 className="relative flex flex-col font-display text-h1 leading-none tracking-tight uppercase">
        {title.split(" ").map((word) => (
          <span key={word}>{word}</span>
        ))}
      </h3>
      <div className="relative flex items-end justify-between gap-4">
        <p className={cn("text-small", isPass ? "text-canvas/70" : "text-ink-muted")}>{caption}</p>
        {logo}
      </div>
    </div>
  );
}
