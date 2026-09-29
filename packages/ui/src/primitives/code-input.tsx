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
  /**
   * Called once each time the person completes the code: types the last digit, pastes or autofills a full code.
   * Not called when `value` is set to a full code from outside. Use it to check the code straight away.
   */
  onComplete?: (code: string) => void;
  /** Number of digits, one box each. */
  length?: number;
  /**
   * `checking`: the code is being checked; the digits stay visible but can't be changed, and focus stays put.
   * `success`: the code was accepted. Put the matching text in a live region next to the field.
   * Errors come from `FormField` (or `aria-invalid`), as with every input.
   */
  status?: "checking" | "success";
  /**
   * The boxes shake once when the field turns invalid (not with reduced motion). Change this value, e.g. a count
   * of failed attempts, to shake again for a new error while the field stays invalid.
   */
  errorKey?: string | number;
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
  onComplete,
  length = 6,
  status,
  errorKey,
  className,
  disabled,
  readOnly,
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
  // Checking or accepted: read-only, not disabled, so focus stays in the field.
  const fixed = Boolean(readOnly || status);
  const showFocus = focused && !disabled;
  const activeSlot = Math.min(value.length, length - 1);
  const statusBorder = invalid
    ? "border-danger"
    : status === "success"
      ? "border-success"
      : status === "checking"
        ? "border-line-strong"
        : null;

  // Every edit by the person comes through here; only an edit that makes a new full code completes it.
  const change = (code: string) => {
    onChange(code);
    if (code.length === length && code !== value) onComplete?.(code);
  };

  return (
    <div className={cn("relative", disabled && "opacity-60", className)}>
      {/* A new errorKey remounts only these boxes, which restarts the shake; the real input below keeps focus. */}
      <div
        key={errorKey}
        aria-hidden
        className={cn(
          "flex gap-2 rounded-sm",
          invalid && "motion-safe:animate-shake",
          // Nothing can be edited, so the whole code shows focus instead of one box.
          showFocus && fixed && "outline-2 outline-offset-2 outline-ink",
        )}
      >
        {slots.map((slot, position) => {
          const digit = value[position];
          const active = showFocus && !fixed && position === activeSlot;
          return (
            <div
              key={slot}
              className={cn(
                "flex h-14 min-w-0 flex-1 items-center justify-center rounded-sm border bg-canvas font-text text-h3 font-normal text-ink transition-colors duration-150 ease-standard",
                statusBorder ?? (active ? "border-ink" : "border-line-strong"),
                status === "checking" && "text-ink-muted",
                // Like the text fields: a 2px ink border (an outline just inside the border, so it stays visible
                // in Windows contrast themes).
                active && "outline-1 -outline-offset-2 outline-ink",
              )}
            >
              {digit ??
                (active ? <span className="h-6 w-px bg-ink" /> : <span className="text-ink-muted">–</span>)}
            </div>
          );
        })}
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        disabled={disabled}
        readOnly={fixed}
        // opacity-0 (not transparent colours): contrast themes and autofill styling can't make it show through.
        className={cn(
          "absolute inset-0 size-full opacity-0 disabled:cursor-not-allowed",
          status === "checking" ? "cursor-progress" : fixed ? "cursor-default" : "cursor-text",
        )}
        {...field}
        {...props}
        value={value}
        // No maxLength: a pasted "482 913" must keep all six digits once the space is dropped.
        onChange={(event) => change(digitsOf(event.target.value, length))}
        onPaste={(event) => {
          onPaste?.(event);
          const pasted = digitsOf(event.clipboardData.getData("text"), length);
          if (fixed || !pasted) return;
          event.preventDefault();
          change(pasted);
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
