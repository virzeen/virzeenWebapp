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
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type InputProps = React.ComponentProps<"input"> & VariantProps<typeof fieldVariants>;

/**
 * Single-line text input. Place inside `FormField` for the label, helper and error wiring.
 * Always set `type`, `inputMode` and `autoComplete` (e.g. `type="tel" inputMode="numeric"`).
 */
export function Input({ className, variant, type = "text", ...props }: InputProps) {
  const { labelId: _labelId, ...field } = useFormFieldControl();
  return (
    <input type={type} className={cn(fieldVariants({ variant }), "h-11", className)} {...field} {...props} />
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
