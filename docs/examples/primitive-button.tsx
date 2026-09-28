// packages/ui/src/primitives/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  // base: layout → typography → interaction → focus → disabled
  "gap-2 font-medium inline-flex items-center justify-center rounded-sm font-text text-body transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-canvas hover:bg-ink/90",
        secondary: "border border-line bg-canvas text-ink hover:bg-surface",
        ghost: "text-ink hover:bg-surface",
        destructive: "bg-danger text-canvas hover:bg-danger/90",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5", // 44px: minimum touch target
        lg: "h-12 px-6",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, disables the button, and sets aria-busy. */
    loading?: boolean;
  };

/**
 * Triggers an action (submit, add to bag, open a drawer).
 * For navigation to a URL use `Link` instead.
 * Icon-only buttons (`size="icon"`) must have an `aria-label`.
 */
export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export { buttonVariants };
