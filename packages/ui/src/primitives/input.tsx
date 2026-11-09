"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { useFormFieldControl } from "./form-field";

// Focus thickens the border to 2px in ink: an outline just inside the 1px border, so no blue ring, no layout
// shift, and it stays visible in Windows contrast themes. `outline-solid` overrides the base `:focus-visible` reset.
const fieldVariants = cva(
  "w-full rounded-sm border bg-canvas px-3 font-text text-body text-ink transition-colors duration-150 ease-standard placeholder:text-ink-muted focus-visible:border-ink focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border-line-strong aria-invalid:border-danger",
        error: "border-danger",
        // A rounded grey box without a line (the header search, Nike's); focus still draws the 2px ink line.
        pill: "rounded-full border-transparent bg-surface px-5 aria-invalid:border-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof fieldVariants> & {
    /** A decorative icon inside the box at the start (a magnifier on a search box); the text starts after it. */
    startIcon?: React.ReactNode;
  };

/**
 * Single-line text input. Place inside `FormField` for the label, helper and error wiring.
 * Always set `type`, `inputMode` and `autoComplete` (e.g. `type="tel" inputMode="numeric"`).
 * `variant="pill"` with a `startIcon`: the header search box (a rounded grey box with a magnifier).
 */
export function Input({ className, variant, type = "text", startIcon, ...props }: InputProps) {
  const { labelId: _labelId, ...field } = useFormFieldControl();
  const input = (
    <input
      type={type}
      className={cn(fieldVariants({ variant }), "h-11", startIcon ? "pl-12" : undefined, className)}
      {...field}
      {...props}
    />
  );
  if (!startIcon) return input;
  return (
    <span className="relative flex w-full items-center">
      <span aria-hidden className="pointer-events-none absolute left-4 flex text-ink">
        {startIcon}
      </span>
      {input}
    </span>
  );
}

export type TextareaProps = React.ComponentProps<"textarea"> & VariantProps<typeof fieldVariants>;

/** Multi-line text input. Place inside `FormField`. */
export function Textarea({ className, variant, rows = 4, ...props }: TextareaProps) {
  const { labelId: _labelId, ...field } = useFormFieldControl();
  return (
    <textarea
      rows={rows}
      className={cn(fieldVariants({ variant }), "min-h-24 py-2", className)}
      {...field}
      {...props}
    />
  );
}

export { fieldVariants };
