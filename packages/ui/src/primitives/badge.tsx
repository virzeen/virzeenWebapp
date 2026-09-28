import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeVariants = cva(
  "gap-1 px-2.5 py-0.5 inline-flex items-center rounded-full border text-caption whitespace-nowrap uppercase",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface text-ink",
        accent: "border-accent bg-accent text-accent-contrast",
        success: "border-success/30 bg-canvas text-success",
        warning: "border-warning/40 bg-canvas text-warning",
        danger: "border-danger/40 bg-canvas text-danger",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

/** Status label ("New", "Only 3 left", "Paid"). Not clickable — use `Button`/`Link` for actions. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
