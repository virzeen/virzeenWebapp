"use client";

import { useMemo, useState } from "react";
import { cn } from "../lib/cn";
import { useFormFieldControl } from "./form-field";

export type CodeInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "maxLength" | "size" | "value" | "defaultValue" | "onChange"
> & {
  /** The digits entered so far. Controlled: with React Hook Form use `Controller` / `useController`. */
  value: string;
  /** Receives the cleaned code (digits only, at most `length`). */
  onChange: (code: string) => void;
  /** Number of digits, one box each. */
  length?: number;
};

const digitsOf = (text: string, length: number) => text.replace(/\D/g, "").slice(0, length);

/**
 * A one-time code (e.g. the 6-digit sign-in code) shown as separate boxes. One real input sits invisibly over the
 * boxes, so typing, pasting, phone autofill (`autoComplete="one-time-code"`) and screen readers work as with
 * `Input`. Digits only. Editing always happens at the end (the highlighted box); a paste replaces the whole code.
 * Place inside `FormField`.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  className,
  disabled,
  onFocus,
  onBlur,
  onPaste,
  onSelect,
  ...props
}: CodeInputProps) {
  const { labelId: _labelId, ...field } = useFormFieldControl();
  const [focused, setFocused] = useState(false);
  const slots = useMemo(() => Array.from({ length }, (_, n) => `slot-${n}`), [length]);
  const invalid = Boolean(props["aria-invalid"] ?? field["aria-invalid"]);
  const activeSlot = Math.min(value.length, length - 1);

  return (
    <div className={cn("relative flex gap-2", disabled && "opacity-60", className)}>
      {slots.map((slot, position) => {
        const digit = value[position];
        const active = focused && position === activeSlot;
        return (
          <div
            key={slot}
            aria-hidden
            className={cn(
              "flex h-14 min-w-0 flex-1 items-center justify-center rounded-sm border bg-canvas font-text text-h3 font-normal text-ink transition-colors duration-150 ease-standard",
              invalid ? "border-danger" : active ? "border-ink" : "border-line-strong",
              // An outline (not a box-shadow ring) so focus stays visible in Windows contrast themes.
              active && "outline-2 outline-offset-2 outline-focus",
            )}
          >
            {digit ??
              (active ? <span className="h-6 w-px bg-ink" /> : <span className="text-ink-muted">–</span>)}
          </div>
        );
      })}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        disabled={disabled}
        // opacity-0 (not transparent colours): contrast themes and autofill styling can't make it show through.
        className="absolute inset-0 size-full cursor-text opacity-0 disabled:cursor-not-allowed"
        {...field}
        {...props}
        value={value}
        // No maxLength: a pasted "482 913" must keep all six digits once the space is dropped.
        onChange={(event) => onChange(digitsOf(event.target.value, length))}
        onPaste={(event) => {
          onPaste?.(event);
          const pasted = digitsOf(event.clipboardData.getData("text"), length);
          if (!pasted) return;
          event.preventDefault();
          onChange(pasted);
        }}
        onSelect={(event) => {
          // Keep the (invisible) caret at the end, where the highlighted box is.
          const input = event.currentTarget;
          const end = input.value.length;
          if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
          onSelect?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </div>
  );
}
