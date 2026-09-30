"use client";

import { Input, type InputProps } from "@virzeen/ui";
import { useState } from "react";

// Admins type rupees; the database stores integer paisa (data-rules.md §1). Blank or not a number → NaN, which
// the schema turns into "Enter a price in rupees, e.g. 1250".
export const toRupees = (paisa: number | undefined) =>
  paisa === undefined || !Number.isFinite(paisa) ? "" : String(paisa / 100);
export const toPaisa = (rupees: string) => {
  const text = rupees.replace(/,/g, "").trim();
  return text === "" ? Number.NaN : Math.round(Number(text) * 100);
};

type RupeesInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange"> & {
  value: number | undefined;
  onValueChange: (paisa: number) => void;
};

/**
 * A rupee amount for a paisa form value. Keeps what the admin typed ("1,350" or "12.5") and only rewrites the box
 * when the value changes from outside (another field sets it, or the form reloads after a save).
 */
export function RupeesInput({ value, onValueChange, ...props }: RupeesInputProps) {
  const [text, setText] = useState(() => toRupees(value));
  const [shown, setShown] = useState(value);
  if (!Object.is(value, shown)) {
    setShown(value);
    if (!Object.is(toPaisa(text), value)) setText(toRupees(value));
  }
  return (
    <Input
      inputMode="decimal"
      autoComplete="off"
      {...props}
      value={text}
      onChange={(e) => {
        const paisa = toPaisa(e.target.value);
        setText(e.target.value);
        setShown(paisa);
        onValueChange(paisa);
      }}
    />
  );
}
