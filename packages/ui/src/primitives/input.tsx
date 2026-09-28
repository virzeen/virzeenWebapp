"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { useFormFieldControl } from "./form-field";

const fieldVariants = cva(
  "px-3 w-full rounded-sm border bg-canvas font-text text-body text-ink transition-colors duration-150 ease-standard placeholder:text-ink-muted focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60",
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
