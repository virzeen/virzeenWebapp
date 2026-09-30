"use client";

import { FormField, Textarea } from "@virzeen/ui";
import { useState } from "react";
import { Controller, type Control, type FieldPathByValue, type FieldValues } from "react-hook-form";
import { linesError, sameLines, toLines } from "./text-lines";

/** `TOut`: what the form's resolver hands on submit (differs from `T` when the schema transforms, e.g. size guides). */
type LinesFieldProps<T extends FieldValues, TOut = T> = {
  control: Control<T, unknown, TOut>;
  name: FieldPathByValue<T, string[]>;
  label: string;
  helper: string;
  rows?: number;
};

/**
 * A list of short texts (benefits, product details, how-to-measure tips) typed one per line. The form value is
 * the list of lines that aren't blank, trimmed; the box keeps exactly what was typed (a new empty line stays while
 * typing) and only rewrites itself when the value changes from outside, e.g. the form reloads after a save.
 */
export function LinesField<T extends FieldValues, TOut = T>({
  control,
  name,
  label,
  helper,
  rows = 4,
}: LinesFieldProps<T, TOut>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <LinesBox
          ref={field.ref}
          name={field.name}
          value={(field.value ?? []) as string[]}
          error={fieldState.error}
          label={label}
          helper={helper}
          rows={rows}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

type LinesBoxProps = {
  ref: React.Ref<HTMLTextAreaElement>;
  name: string;
  value: string[];
  error: unknown;
  label: string;
  helper: string;
  rows: number;
  onChange: (lines: string[]) => void;
  onBlur: () => void;
};

function LinesBox({ ref, name, value, error, label, helper, rows, onChange, onBlur }: LinesBoxProps) {
  const [text, setText] = useState(() => value.join("\n"));
  const [shown, setShown] = useState(value);
  // Compared by content: react-hook-form hands back a copy of the list after each change.
  if (!sameLines(shown, value)) {
    const typed = value.join("\n");
    setShown(value);
    if (!sameLines(toLines(text), toLines(typed))) setText(typed);
  }

  return (
    <FormField label={label} helper={helper} error={linesError(error, text)}>
      <Textarea
        ref={ref}
        name={name}
        rows={rows}
        value={text}
        onBlur={onBlur}
        onChange={(e) => {
          const lines = toLines(e.target.value);
          setText(e.target.value);
          setShown(lines);
          onChange(lines);
        }}
      />
    </FormField>
  );
}
