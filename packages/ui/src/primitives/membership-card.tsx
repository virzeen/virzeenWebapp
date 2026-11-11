import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const cardVariants = cva(
  "relative flex aspect-[1.586] w-full max-w-md flex-col justify-between overflow-hidden rounded-md p-6",
  {
    variants: {
      level: {
        // The free MONO Member card: plain, grey, a hairline.
        member: "border border-line bg-surface text-ink",
        // The Monochrome Pass: black with a faint sheen and an inner hairline frame, like a metal card.
        pass: "bg-linear-to-br from-ink via-accent to-ink text-canvas shadow-md",
      },
    },
    defaultVariants: { level: "member" },
  },
);

export type MembershipCardProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof cardVariants> & {
    /** The member's name. */
    name: string;
    /** The level's name, top right: "MONO Member" or "Monochrome Pass". */
    title: string;
    /** Bottom line: "Member since Nov 2026" or "Valid until 12 May 2027". */
    caption: string;
  };

/**
 * The member's card at the top of the account (specs/membership-portal.md): the Virzeen wordmark in type, the level's
 * name, the member's name and one caption line. `level="member"` is the plain grey card of a free MONO Member;
 * `level="pass"` is the black Monochrome Pass card. Decorative text only: it holds no controls, and the page names
 * the level in a heading too.
 */
export function MembershipCard({ level, name, title, caption, className, ...props }: MembershipCardProps) {
  const isPass = level === "pass";
  return (
    <div className={cn(cardVariants({ level }), className)} {...props}>
      {isPass && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-sm border border-canvas/25"
        />
      )}
      <div className="relative flex items-start justify-between gap-4">
        <span aria-hidden className="font-display text-h3 tracking-widest uppercase">
          Virzeen
        </span>
        <span
          className={cn(
            "text-caption tracking-widest uppercase",
            isPass ? "text-canvas/80" : "text-ink-muted",
          )}
        >
          {title}
        </span>
      </div>
      <div className="relative flex flex-col gap-1">
        <p className="font-display text-h2 wrap-anywhere">{name}</p>
        <p className={cn("text-small", isPass ? "text-canvas/70" : "text-ink-muted")}>{caption}</p>
      </div>
    </div>
  );
}
