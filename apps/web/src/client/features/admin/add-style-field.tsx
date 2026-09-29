"use client";

import { Button, FormField, Input } from "@virzeen/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { keepFocusOnPress } from "./form-focus";

/**
 * Adds a style (a colour or a design). `onAdd` returns why a name can't be used, or null when it was added.
 * Enter adds it and never submits the product form.
 */
export function AddStyleField({ first, onAdd }: { first: boolean; onAdd: (name: string) => string | null }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const problem = onAdd(name);
    setError(problem);
    if (!problem) setName("");
  }

  return (
    <FormField
      label={first ? "Add a style" : "Add another style"}
      helper={first ? "A colour or a design, e.g. Black or Mountain print." : undefined}
      error={error ?? undefined}
    >
      <div className="flex gap-2">
        <Input
          value={name}
          maxLength={40}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Style name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add();
          }}
        />
        <Button
          variant="secondary"
          shape="pill"
          disabled={name.trim() === ""}
          onMouseDown={keepFocusOnPress}
          onClick={add}
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          Add style
        </Button>
      </div>
    </FormField>
  );
}
