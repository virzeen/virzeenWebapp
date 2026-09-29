"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "../lib/cn";
import { useFormFieldControl } from "./form-field";

export type SelectOption = string | { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  options: readonly SelectOption[];
  value?: string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
  /** Called when focus leaves the select, but not when its list opens, so validate-on-blur waits for a choice. */
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  /** Reaches the trigger button: pass react-hook-form's `field.ref` so a failed submit can focus the select. */
  ref?: React.Ref<HTMLButtonElement>;
};

const normalise = (option: SelectOption) =>
  typeof option === "string" ? { value: option, label: option, disabled: false } : option;

/**
 * Choose one option from a list of 5+ (province, district, category). For 2–4 options use `RadioGroup`.
 * Place inside `FormField`; with react-hook-form use a `Controller` and pass `field.ref` and `field.onBlur`.
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Choose an option",
  disabled,
  name,
  className,
  "aria-label": ariaLabel,
  onBlur,
  ref,
}: SelectProps) {
  const { labelId: _labelId, ...field } = useFormFieldControl();
  return (
    <SelectPrimitive.Root
      // Radix treats "" as "no value"; keep the placeholder visible for empty strings.
      value={value === "" ? undefined : value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        {...field}
        ref={ref}
        aria-label={ariaLabel}
        onBlur={(event) => {
          // Opening the list moves focus into it: that isn't leaving the field.
          if (event.currentTarget.dataset.state !== "open") onBlur?.(event);
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-sm border border-line-strong bg-canvas px-3 text-left font-text text-body text-ink transition-colors duration-150 ease-standard focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60 aria-invalid:border-danger data-placeholder:text-ink-muted",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-ink-muted" strokeWidth={1.5} aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-20 max-h-80 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line bg-canvas shadow-md data-[state=open]:animate-fade-in"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map(normalise).map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-11 cursor-pointer items-center rounded-sm py-2 pr-3 pl-8 text-body text-ink outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-surface"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="size-4" strokeWidth={1.5} aria-hidden />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
