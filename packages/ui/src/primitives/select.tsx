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
};

const normalise = (option: SelectOption) =>
  typeof option === "string" ? { value: option, label: option, disabled: false } : option;

/**
 * Choose one option from a list of 5+ (province, district, category). For 2–4 options use `RadioGroup`.
 * Place inside `FormField`; with react-hook-form use a `Controller`.
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
        aria-label={ariaLabel}
        className={cn(
          "h-11 gap-2 px-3 flex w-full items-center justify-between rounded-sm border border-line-strong bg-canvas text-left font-text text-body text-ink transition-colors duration-150 ease-standard focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60 aria-invalid:border-danger data-placeholder:text-ink-muted",
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
          className="max-h-80 z-20 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line bg-canvas shadow-md data-[state=open]:animate-fade-in"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map(normalise).map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="min-h-11 py-2 pr-3 pl-8 relative flex cursor-pointer items-center rounded-sm text-body text-ink outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-surface"
              >
                <SelectPrimitive.ItemIndicator className="left-2 absolute inline-flex items-center">
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
