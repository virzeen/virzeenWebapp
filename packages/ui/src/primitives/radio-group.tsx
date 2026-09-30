"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { createContext, useContext } from "react";
import { cn } from "../lib/cn";
import { useFormFieldControl } from "./form-field";

type Variant = "default" | "card" | "swatch" | "segmented";
const VariantContext = createContext<Variant>("default");

const groupVariants = cva("", {
  variants: {
    variant: {
      default: "flex flex-col gap-3",
      card: "grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2",
      swatch: "flex flex-wrap gap-2",
      segmented: "inline-flex w-fit rounded-full border border-line-strong bg-canvas p-0.5",
    },
  },
  defaultVariants: { variant: "default" },
});

export type RadioGroupProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Root>, "orientation"> &
  VariantProps<typeof groupVariants>;

/**
 * Pick one of 2–4 choices (payment method, shipping option) or a product variant (size/colour).
 * `variant="card"`: bordered option tiles (variant pickers, payment methods). Unavailable options stay visible
 * but disabled with a line-through. `variant="swatch"`: square picture tiles without a caption (product styles): the
 * label is the accessible name and the tile's `title`; the picked tile gets an ink border, not a fill, so the picture
 * stays visible; a disabled tile is dimmed with a diagonal line. `variant="segmented"`: 2–4 short choices joined in one
 * pill (e.g. cm | in), the picked one filled; 44px tall, 36px from lg. Inside `FormField` the group is labelled by the
 * field label.
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
  /** Visible label; also the accessible name. Swatch variant: not shown, but still the accessible name and `title`. */
  label: React.ReactNode;
  /** Extra line under the label (card variant), e.g. "Pay when your order arrives". */
  description?: React.ReactNode;
  /** Content on the right of a card (e.g. a logo or price). */
  aside?: React.ReactNode;
  /** Swatch variant: the picture that fills the tile (decorative: the label names the option). */
  media?: React.ReactNode;
};

/** One option inside `RadioGroup`. */
export function RadioGroupItem({
  className,
  label,
  description,
  aside,
  media,
  ...props
}: RadioGroupItemProps) {
  const variant = useContext(VariantContext);

  if (variant === "swatch") {
    return (
      <RadioGroupPrimitive.Item
        title={typeof label === "string" ? label : undefined}
        className={cn(
          "group relative size-16 shrink-0 overflow-hidden rounded-sm border border-line bg-surface transition-colors duration-150 ease-standard hover:border-ink-muted focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:hover:border-line data-[state=checked]:border-ink data-[state=checked]:outline-1 data-[state=checked]:-outline-offset-2 data-[state=checked]:outline-ink data-[state=checked]:outline-solid",
          className,
        )}
        {...props}
      >
        <span className="block size-full group-disabled:opacity-50">{media}</span>
        <span className="sr-only">{label}</span>
        {/* Sold out: a line from corner to corner, like a struck-through size. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 hidden size-full text-ink-muted group-disabled:block"
        >
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </RadioGroupPrimitive.Item>
    );
  }

  if (variant === "segmented") {
    return (
      <RadioGroupPrimitive.Item
        className={cn(
          "flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-body font-medium text-ink transition-colors duration-150 ease-standard hover:bg-surface focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-ink-muted disabled:line-through data-[state=checked]:bg-ink data-[state=checked]:text-canvas lg:min-h-9",
          className,
        )}
        {...props}
      >
        {label}
      </RadioGroupPrimitive.Item>
    );
  }

  if (variant === "card") {
    return (
      <RadioGroupPrimitive.Item
        className={cn(
          "group relative flex min-h-11 items-center justify-between gap-3 rounded-sm border border-line-strong bg-canvas px-3 py-2 text-left text-body text-ink transition-colors duration-150 ease-standard hover:border-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted disabled:line-through data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-canvas",
          description ? "py-3" : "justify-center",
          className,
        )}
        {...props}
      >
        <span className="flex flex-col gap-1">
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
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink has-disabled:cursor-not-allowed has-disabled:text-ink-muted">
      <RadioGroupPrimitive.Item
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 data-[state=checked]:border-ink",
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
