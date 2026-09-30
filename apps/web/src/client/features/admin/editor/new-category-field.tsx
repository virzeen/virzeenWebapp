"use client";

import { Button, FormField, Input, toast } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { saveCategoryAction } from "@/server/actions/admin/catalog";
import { slugify } from "../slugify";
import type { CategoryOption } from "./editor-context";

type NewCategoryFieldProps = {
  /** The category was made: pick it. Returns a problem to show here, or null. */
  onAdded: (category: CategoryOption) => string | null;
};

/** "New category" under the category select (as in the form editor's Organise box): a name, then Add category. */
export function NewCategoryField({ onAdded }: NewCategoryFieldProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);

  // The box replaces the pressed button, and Cancel gives focus back to it.
  useEffect(() => {
    if (adding) inputRef.current?.focus();
    else if (opened.current) toggleRef.current?.focus();
    opened.current = adding;
  }, [adding]);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name");
    setError(null);
    const slug = slugify(trimmed);
    startTransition(async () => {
      const result = await saveCategoryAction({ name: trimmed, slug, sortOrder: 0 });
      if (!result.ok) {
        setError(
          result.error.code === "VALIDATION_FAILED" && result.error.fields?.slug
            ? "A category with this name already exists. Choose it in the list."
            : messageFor(result.error),
        );
        return;
      }
      toast.success("Category added");
      router.refresh();
      setError(onAdded({ value: result.data.id, label: trimmed, slug }));
    });
  }

  if (!adding) {
    return (
      <Button ref={toggleRef} variant="link" size="sm" className="self-start" onClick={() => setAdding(true)}>
        + New category
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField label="New category name" error={error ?? undefined}>
        <Input
          value={name}
          maxLength={60}
          autoComplete="off"
          enterKeyHint="done"
          ref={inputRef}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add();
          }}
        />
      </FormField>
      <div className="flex gap-2">
        <Button size="sm" shape="pill" loading={pending} onClick={add}>
          Add category
        </Button>
        <Button variant="ghost" size="sm" shape="pill" disabled={pending} onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
