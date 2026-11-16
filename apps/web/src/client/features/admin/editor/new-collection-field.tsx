"use client";

import { Button, FormField, Input, toast } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { saveCollectionAction } from "@/server/actions/admin/catalog";
import { slugify } from "../slugify";
import type { CollectionOption } from "./editor-context";

type NewCollectionFieldProps = {
  /** The collection was made: pick it. Returns a problem to show here, or null. */
  onAdded: (collection: CollectionOption) => string | null;
};

/** "New collection" under the main collection select: a name, then Add collection. Public until changed in Collections. */
export function NewCollectionField({ onAdded }: NewCollectionFieldProps) {
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
      const result = await saveCollectionAction({
        name: trimmed,
        slug,
        sortOrder: 0,
        isFeatured: false,
        audience: "PUBLIC",
      });
      if (!result.ok) {
        setError(
          result.error.code === "VALIDATION_FAILED" && result.error.fields?.slug
            ? "A collection with this name already exists. Choose it in the list."
            : messageFor(result.error),
        );
        return;
      }
      toast.success("Collection added");
      router.refresh();
      setError(onAdded({ id: result.data.id, name: trimmed, slug }));
    });
  }

  if (!adding) {
    return (
      <Button ref={toggleRef} variant="link" size="sm" className="self-start" onClick={() => setAdding(true)}>
        + New collection
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField label="New collection name" error={error ?? undefined}>
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
          Add collection
        </Button>
        <Button variant="ghost" size="sm" shape="pill" disabled={pending} onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
