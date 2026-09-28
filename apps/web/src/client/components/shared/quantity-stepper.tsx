"use client";

import { Button } from "@virzeen/ui";
import { Minus, Plus } from "lucide-react";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Names the item for screen readers: "Quantity of Linen Overshirt". */
  label: string;
};

/** − / value / + with limits from stock (components-catalog.md §2). */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  label,
}: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label={label}>
      <Button
        variant="ghost"
        size="icon"
        shape="pill"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" strokeWidth={1.5} aria-hidden />
      </Button>
      <output className="min-w-6 text-center text-body tabular-nums" aria-live="polite">
        {value}
      </output>
      <Button
        variant="ghost"
        size="icon"
        shape="pill"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" strokeWidth={1.5} aria-hidden />
      </Button>
    </div>
  );
}
