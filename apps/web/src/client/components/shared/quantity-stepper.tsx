"use client";

import { Button } from "@virzeen/ui";
import { Minus, Plus, Trash2 } from "lucide-react";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /**
   * At the minimum, "−" becomes a bin that calls this, like Nike's bag: one button takes the line away. Without it
   * "−" is disabled at the minimum.
   */
  onRemove?: () => void;
  disabled?: boolean;
  /** Names the item for screen readers: "Quantity of Linen Overshirt". */
  label: string;
};

/** − / value / + in a pill, with limits from stock (components-catalog.md §2). */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  onRemove,
  disabled = false,
  label,
}: QuantityStepperProps) {
  const removes = onRemove !== undefined && value <= min;
  return (
    <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label={label}>
      {/* One element whether it lowers or removes, so keyboard focus stays on it when it switches. */}
      <Button
        variant="ghost"
        size="icon"
        shape="pill"
        aria-label={removes ? "Remove" : "Decrease quantity"}
        disabled={disabled || (!removes && value <= min)}
        onClick={() => (removes ? onRemove() : onChange(value - 1))}
      >
        {removes ? (
          <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
        ) : (
          <Minus className="size-4" strokeWidth={1.5} aria-hidden />
        )}
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
