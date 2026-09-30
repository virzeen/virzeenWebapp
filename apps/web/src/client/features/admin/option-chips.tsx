"use client";

import { Button, FormField, Input } from "@virzeen/ui";
import { X } from "lucide-react";
import { useState } from "react";
import { keepFocusOnPress } from "./form-focus";
import { sameValue } from "./variant-options";

type OptionChipsProps = {
  /** "Sizes" or "Colours". */
  label: string;
  /** "size" or "colour", for the Remove buttons' names. */
  itemName: string;
  values: string[];
  maxLength: number;
  placeholder: string;
  presets?: { label: string; values: string[] }[];
  onAdd: (values: string[]) => void;
  onRemove: (value: string) => void;
};

/**
 * A list of sizes or colours: type one and press Enter (or separate several with commas). Enter never submits the
 * product form. Each value is a button that removes it.
 */
export function OptionChips({
  label,
  itemName,
  values,
  maxLength,
  placeholder,
  presets = [],
  onAdd,
  onRemove,
}: OptionChipsProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(parts: string[]) {
    const fresh: string[] = [];
    for (const part of parts.map((p) => p.trim()).filter(Boolean)) {
      if (part.length > maxLength) {
        setError(`Keep each ${itemName} under ${maxLength} characters`);
        continue;
      }
      if (![...values, ...fresh].some((known) => sameValue(known, part))) fresh.push(part);
    }
    if (fresh.length > 0) onAdd(fresh);
  }

  function commitTyped() {
    setError(null);
    add(text.split(","));
    setText("");
  }

  const unusedPresets = presets.filter((preset) =>
    preset.values.some((v) => !values.some((k) => sameValue(k, v))),
  );

  return (
    <div className="flex flex-col gap-3">
      <FormField
        label={label}
        helper="Type one and press Enter, or separate several with commas."
        error={error ?? undefined}
      >
        <div className="flex gap-2">
          <Input
            value={text}
            placeholder={placeholder}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => {
              const parts = e.target.value.split(",");
              // Everything before the last comma is finished (typed or pasted "S, M, L,").
              if (parts.length > 1) {
                setError(null);
                add(parts.slice(0, -1));
              }
              setText(parts.at(-1) ?? "");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              commitTyped();
            }}
          />
          <Button
            variant="secondary"
            shape="pill"
            disabled={text.trim() === ""}
            onMouseDown={keepFocusOnPress}
            onClick={commitTyped}
          >
            Add
          </Button>
        </div>
      </FormField>
      {(values.length > 0 || unusedPresets.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {values.map((value) => (
            <Button
              key={value}
              variant="secondary"
              size="sm"
              shape="pill"
              aria-label={`Remove ${itemName} ${value}`}
              onClick={() => onRemove(value)}
            >
              {value}
              <X className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          ))}
          {unusedPresets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              shape="pill"
              onMouseDown={keepFocusOnPress}
              onClick={() => add(preset.values)}
            >
              + {preset.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
