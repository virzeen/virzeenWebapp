"use client";

import { createContext, useContext, useId } from "react";
import { cn } from "../lib/cn";

type FormFieldContextValue = {
  id: string;
  labelId: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/**
 * Accessibility props for a control rendered inside `FormField` (id, aria-describedby, aria-invalid, aria-required).
 * Used by Input, Textarea, Select and RadioGroup; returns an empty object outside a FormField.
 */
export function useFormFieldControl() {
  const ctx = useContext(FormFieldContext);
  if (!ctx) return {};
  return {
    id: ctx.id,
    labelId: ctx.labelId,
    "aria-describedby": ctx.describedBy,
    "aria-invalid": ctx.invalid || undefined,
    "aria-required": ctx.required || undefined,
  };
}

export type FormFieldProps = {
  /** Visible label. Always required: no placeholder-only inputs (docs/ui/patterns.md §4). */
  label: React.ReactNode;
  /** Shown at the end of the label row, e.g. a "Size guide" button. Not part of the label. */
  labelAside?: React.ReactNode;
  /** Helper text shown under the control. */
  helper?: React.ReactNode;
  /** Error message; turns the control into its error state. */
  error?: string | undefined;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Wraps every form input: label + control + helper + error, with ids wired for screen readers.
 * Put exactly one control (Input, Textarea, Select, RadioGroup) inside. `labelAside` puts a small action at the end
 * of the label row (the product page's "Size guide" next to "Select size").
 */
export function FormField({
  label,
  labelAside,
  helper,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;
  const labelElement = (
    <label id={labelId} htmlFor={id} className="text-small font-medium text-ink">
      {label}
      {required && (
        <span className="text-ink-muted" aria-hidden>
          {" "}
          *
        </span>
      )}
    </label>
  );

  return (
    <FormFieldContext value={{ id, labelId, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-2", className)}>
        {labelAside ? (
          <div className="flex items-center justify-between gap-4">
            {labelElement}
            {labelAside}
          </div>
        ) : (
          labelElement
        )}
        {children}
        {helper && !error && (
          <p id={helperId} className="text-small text-ink-muted">
            {helper}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-small text-danger">
            {error}
          </p>
        )}
      </div>
    </FormFieldContext>
  );
}
