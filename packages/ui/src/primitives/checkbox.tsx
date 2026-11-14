"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

export type CheckboxProps = Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, "children"> & {
  /** Visible label next to the box; also the accessible name. */
  label: React.ReactNode;
  description?: React.ReactNode;
  /** A small picture before the label (decorative: give it alt=""), like Nike's "Select your interests" rows. */
  media?: React.ReactNode;
  /** The box at the end of the row instead of the start, the label filling the space between (the picture rows). */
  boxAtEnd?: boolean;
};

/**
 * Agree to something or toggle a filter. For instant on/off settings use `Switch`. `media` with `boxAtEnd` makes a
 * picture row: thumbnail, name, box on the right (the profile's "Choose your picks" list).
 */
export function Checkbox({
  className,
  label,
  description,
  media,
  boxAtEnd = false,
  ...props
}: CheckboxProps) {
  const box = (
    <CheckboxPrimitive.Root
      className={cn(
        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-canvas transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-canvas",
        boxAtEnd && "mt-0",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-4" strokeWidth={2} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 py-2 text-body text-ink has-disabled:cursor-not-allowed has-disabled:text-ink-muted",
        boxAtEnd && "items-center gap-4",
      )}
    >
      {media}
      {!boxAtEnd && box}
      <span className={cn("flex flex-col", boxAtEnd && "flex-1")}>
        <span>{label}</span>
        {description && <span className="text-small text-ink-muted">{description}</span>}
      </span>
      {boxAtEnd && box}
    </label>
  );
}

export type SwitchProps = Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, "children"> & {
  label: React.ReactNode;
  description?: React.ReactNode;
};

/** Instant on/off setting (e.g. "Published"). For agreeing or filtering use `Checkbox`. */
export function Switch({ className, label, description, ...props }: SwitchProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-body text-ink has-disabled:cursor-not-allowed has-disabled:text-ink-muted">
      <span className="flex flex-col">
        <span>{label}</span>
        {description && <span className="text-small text-ink-muted">{description}</span>}
      </span>
      <SwitchPrimitive.Root
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line-strong bg-surface transition-colors duration-150 ease-standard focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 data-[state=checked]:border-ink data-[state=checked]:bg-ink",
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-full bg-ink shadow-sm transition-transform duration-150 ease-standard data-[state=checked]:translate-x-6 data-[state=checked]:bg-canvas" />
      </SwitchPrimitive.Root>
    </label>
  );
}
