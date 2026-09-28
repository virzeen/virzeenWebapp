"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { createContext, useContext } from "react";
import { cn } from "../lib/cn";
import { useFormFieldControl } from "./form-field";

type Variant = "default" | "card";
const VariantContext = createContext<Variant>("default");

const groupVariants = cva("", {
  variants: {
    variant: {
      default: "gap-3 flex flex-col",
      card: "gap-2 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))]",
    },
  },
  defaultVariants: { variant: "default" },
});

export type RadioGroupProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Root>, "orientation"> &
  VariantProps<typeof groupVariants>;

/**
 * Pick one of 2–4 choices (payment method, shipping option) or a product variant (size/colour).
 * `variant="card"`: bordered option tiles (variant pickers, payment methods). Unavailable options stay visible
 * but disabled with a line-through. Inside `FormField` the group is labelled by the field label.
 */
export function RadioGroup({ className, variant, ...props }: RadioGroupProps) {
  const { labelId, "aria-describedby": describedBy, "aria-invalid": invalid } = useFormFieldControl();
  return (
    <VariantContext value={variant ?? "default"}>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className={cn(groupVariants({ variant }), className)}
        {...props}
      />
    </VariantContext>
  );
}

export type RadioGroupItemProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, "children"> & {
  /** Visible label; also the accessible name. */
  label: React.ReactNode;
  /** Extra line under the label (card variant), e.g. "Pay when your order arrives". */
  description?: React.ReactNode;
  /** Content on the right of a card (e.g. a logo or price). */
  aside?: React.ReactNode;
};

/** One option inside `RadioGroup`. */
export function RadioGroupItem({ className, label, description, aside, ...props }: RadioGroupItemProps) {
  const variant = useContext(VariantContext);

  if (variant === "card") {
    return (
      <RadioGroupPrimitive.Item
        className={cn(
          "group min-h-11 gap-3 px-3 py-2 relative flex items-center justify-between rounded-sm border border-line-strong bg-canvas text-left text-body text-ink transition-colors duration-150 ease-standard hover:border-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted disabled:line-through data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-canvas",
          description ? "py-3" : "justify-center",
          className,
        )}
        {...props}
      >
        <span className="gap-1 flex flex-col">
          <span className="font-medium">{label}</span>
          {description && (
            <span className="text-small text-ink-muted group-aria-checked:text-canvas/80">{description}</span>
          )}
        </span>
        {aside}
      </RadioGroupPrimitive.Item>
    );
  }

  return (
    <label className="min-h-11 gap-3 flex cursor-pointer items-center text-body text-ink has-disabled:cursor-not-allowed has-disabled:text-ink-muted">
      <RadioGroupPrimitive.Item
        className={cn(
          "size-5 flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 data-[state=checked]:border-ink",
          className,
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-ink" />
      </RadioGroupPrimitive.Item>
      <span className="flex flex-col">
        <span>{label}</span>
        {description && <span className="text-small text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}
