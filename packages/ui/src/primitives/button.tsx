import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  // base: layout → typography → interaction → focus → disabled
  "gap-2 font-medium inline-flex shrink-0 items-center justify-center font-text text-body whitespace-nowrap transition-colors duration-150 ease-standard select-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress",
  {
    variants: {
      variant: {
        primary: "bg-ink text-canvas hover:bg-ink/85",
        secondary: "border border-ink/20 bg-canvas text-ink hover:border-ink hover:bg-surface",
        ghost: "text-ink hover:bg-surface",
        inverse: "bg-canvas text-ink hover:bg-canvas/85",
        destructive: "bg-danger text-canvas hover:bg-danger/90",
        link: "px-0 h-auto text-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-small",
        md: "h-11 px-5", // 44px: minimum touch target
        lg: "h-12 px-7",
        icon: "size-11",
      },
      shape: {
        default: "rounded-sm",
        pill: "rounded-full",
      },
    },
    compoundVariants: [{ variant: "link", className: "px-0 h-auto" }],
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
