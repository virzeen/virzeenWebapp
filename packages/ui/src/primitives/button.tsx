import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  // base: layout → typography → interaction → focus → disabled
  "inline-flex shrink-0 items-center justify-center gap-2 font-text text-body font-medium whitespace-nowrap transition-colors duration-150 ease-standard select-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress",
  {
    variants: {
      variant: {
        primary: "bg-ink text-canvas hover:bg-ink/85",
        secondary: "border border-ink/20 bg-canvas text-ink hover:border-ink hover:bg-surface",
        ghost: "text-ink hover:bg-surface",
        inverse: "bg-canvas text-ink hover:bg-canvas/85",
        destructive: "bg-danger text-canvas hover:bg-danger/90",
        link: "text-ink underline-offset-4 hover:underline", // sized by the compound variant below
        underline: "text-ink underline underline-offset-4 hover:text-ink-muted", // an always-underlined text button
        menu: "text-ink hover:text-ink-muted active:text-ink-muted", // a large full-width menu row, sized below
      },
      size: {
        // Nike's pills (owner 2026-11-10): 36px with 16px sides from lg (touch widths keep 44px, our minimum target).
        sm: "h-11 px-4 lg:h-9",
        md: "h-11 px-5", // 44px: minimum touch target
        // Nike's main buttons (Add to Bag, Favourite, Checkout): 60px tall, 24px sides.
        lg: "h-15 px-6",
        icon: "size-11",
      },
      shape: {
        default: "rounded-sm",
        pill: "rounded-full",
      },
    },
    // Compound classes come after the size classes, so they win: a text link has no padding and its own
    // height, but keeps a 44px tap area at every size (the lg: classes undo sm's desktop size).
    compoundVariants: [
      { variant: ["link", "underline"], className: "h-auto min-h-11 px-0 lg:h-auto lg:px-0" },
      // The same row as `Link variant="menu"`: label on the left, a chevron (or other icon) on the right.
      {
        variant: "menu",
        className:
          "h-auto min-h-14 w-full justify-between gap-4 px-0 py-2 text-left font-display text-h2 whitespace-normal lg:h-auto lg:px-0",
      },
    ],
    defaultVariants: { variant: "primary", size: "md", shape: "default" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, disables the button, and sets aria-busy. */
    loading?: boolean;
  };

/**
 * Triggers an action (submit, add to bag, open a drawer).
 * For navigation to a URL use `Link` or `ButtonLink` instead.
 * Icon-only buttons (`size="icon"`) must have an `aria-label`.
 * `shape="pill"` is the brand call-to-action shape; `variant="inverse"` sits on dark imagery.
 * `size="sm"` is for secondary actions in rows: 44px tall on phones and tablets, 36px from `lg` (desktop).
 * `variant="link"` keeps a 44px-tall tap area at every size; `variant="underline"` is the same text button, always
 * underlined, for an action that reads like a link in running content ("View product details").
 * `variant="menu"`: a large full-width row in a menu that opens a second panel (the phone menu's "Shop ›"); it
 * matches `Link variant="menu"`, so buttons and links line up in one list.
 */
export function Button({
  className,
  variant,
  size,
  shape,
  loading = false,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, shape }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden />}
      {children}
    </button>
  );
}

export { buttonVariants };
