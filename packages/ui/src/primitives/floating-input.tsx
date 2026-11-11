"use client";

import { useId } from "react";
import { cn } from "../lib/cn";

export type FloatingInputProps = Omit<React.ComponentProps<"input">, "placeholder"> & {
  /** The visible label. It sits inside the box and floats onto the top line once there is text or focus. */
  label: string;
  /** Error message; turns the box red and is read out with the field. */
  error?: string | undefined;
  /**
   * Something at the end, inside the box: a countdown ("9s") or a small icon button (resend code). The text stops
   * before it. It must be short, and a button in it needs an `aria-label`.
   */
  endAdornment?: React.ReactNode;
};

/**
 * A 56px outlined text box with a floating label, like Nike's sign-in fields (owner request 2026-11-11): the label
 * ("Email*") sits inside the box, and moves up onto the border when the box is focused or filled. Focus thickens the
 * border to 2px ink; no ring. Self-contained: it renders its own label and error, so don't wrap it in `FormField`. `endAdornment` puts a
 * countdown or an icon button inside the box at the end (the sign-in code's resend control).
 * Always set `type`, `inputMode` and `autoComplete`. Pass `required` to add the `*`.
 */
export function FloatingInput({
  label,
  error,
  endAdornment,
  required,
  className,
  type = "text",
  id: idProp,
  ...props
}: FloatingInputProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative">
        <input
          id={id}
          type={type}
          required={required}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "peer h-14 w-full rounded-md border border-line-strong bg-canvas px-4 pt-1 font-text text-body text-ink transition-colors duration-150 ease-standard focus:border-ink focus:outline-1 focus:-outline-offset-2 focus:outline-ink focus:outline-solid disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60 aria-invalid:border-danger",
            endAdornment ? "pr-16" : undefined,
            className,
          )}
          {...props}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-2 flex items-center text-ink-muted">{endAdornment}</div>
        )}
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 bg-canvas px-1 font-text text-body text-ink-muted transition-all duration-150 ease-standard peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:text-small peer-not-placeholder-shown:text-ink-muted peer-focus:top-0 peer-focus:text-small peer-focus:text-ink"
        >
          {label}
          {required && <span aria-hidden>*</span>}
        </label>
      </div>
      {error && (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
