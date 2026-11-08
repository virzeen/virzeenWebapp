"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormField, Input } from "@virzeen/ui";
import { discountCodeFormSchema, type DiscountCodeFormInput } from "@virzeen/validators";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";

type DiscountCodeFieldProps = {
  /** The code whose discount is in the summary, or null. */
  applied: string | null;
  /** Asks the server for totals with this code; resolves to the reason it can't be used, or null when applied. */
  onApply: (code: string) => Promise<string | null>;
  onRemove: () => void;
  /** Another summary refresh is running: wait for it. */
  disabled?: boolean;
};

/**
 * "Add a discount code" in the checkout's Payment step (specs/discount-codes.md). The server checks the code and
 * works out the totals; this only sends what was typed and shows the answer under the field.
 */
export function DiscountCodeField({ applied, onApply, onRemove, disabled = false }: DiscountCodeFieldProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  // Remove was pressed: focus goes to "Add a discount code" once the summary has refreshed without the code.
  const focusToggle = useRef(false);
  const form = useForm<DiscountCodeFormInput>({
    resolver: zodResolver(discountCodeFormSchema),
    defaultValues: { code: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const { setFocus } = form;

  // Opening the field moves focus into it; applying moves focus to Remove (the field it was in goes away).
  useEffect(() => {
    if (open && !applied) setFocus("code");
  }, [open, applied, setFocus]);
  useEffect(() => {
    if (applied) {
      removeRef.current?.focus();
    } else if (focusToggle.current) {
      focusToggle.current = false;
      toggleRef.current?.focus();
    }
  }, [applied]);

  async function submit(values: DiscountCodeFormInput) {
    const refusal = await onApply(values.code);
    if (refusal) {
      form.setError("code", { message: refusal }, { shouldFocus: true });
      return;
    }
    form.reset({ code: "" });
    setOpen(false);
  }

  if (applied) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 rounded-sm border border-line px-4 py-1">
        <p className="text-body wrap-anywhere" data-testid="discount-applied">
          <span className="font-medium">{applied}</span> applied
        </p>
        <Button
          ref={removeRef}
          variant="link"
          aria-label={`Remove discount code ${applied}`}
          disabled={disabled}
          onClick={() => {
            focusToggle.current = true;
            onRemove();
            setOpen(false);
          }}
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={toggleRef}
        variant="link"
        className="self-start"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Add a discount code
      </Button>
      {open && (
        <form
          id={panelId}
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <FormField label="Discount code" error={errors.code?.message} className="flex-1">
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="done"
              maxLength={40}
              {...form.register("code")}
            />
          </FormField>
          {/* Lines up with the input, below the label row. */}
          <Button
            type="submit"
            variant="secondary"
            shape="pill"
            loading={isSubmitting}
            disabled={disabled}
            className="sm:mt-7"
          >
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}
