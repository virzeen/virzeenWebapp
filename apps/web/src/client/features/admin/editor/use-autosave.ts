"use client";

import type { ProductInput } from "@virzeen/validators";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { saveProductAction } from "@/server/actions/admin/catalog";
import type { SaveQueue, SaveState } from "./autosave-queue";
import { createAutosave, type SavedProduct } from "./autosave-run";

export type { SavedProduct } from "./autosave-run";

type AutosaveOptions = {
  form: UseFormReturn<ProductInput>;
  productId: string;
  /** The product's last save when the page opened (ISO), and its values then. */
  savedAt: string;
  savedValues: ProductInput;
  onSaved: (saved: SavedProduct) => void;
  /** The server said the slug is taken: return true after picking another one to try (it saves again). */
  onSlugTaken: () => boolean;
};

// form.setValue / setError without their path types: patches and error paths are dotted strings.
type LooseForm = {
  setValue: (name: string, value: unknown) => void;
  setError: (name: string, error: { type: string; message: string }) => void;
};

/**
 * The product editor's autosave (autosave-run.ts) wired to the form and saveProductAction. `commit()` after every
 * finished edit; `state` is what the top bar shows.
 */
export function useAutosave({
  form,
  productId,
  savedAt,
  savedValues,
  onSaved,
  onSlugTaken,
}: AutosaveOptions) {
  const [state, setState] = useState<SaveState>({ status: "saved", savedAt });
  // The latest callbacks, for saves that finish after a re-render.
  const callbacks = useRef({ onSaved, onSlugTaken });
  useEffect(() => {
    callbacks.current = { onSaved, onSlugTaken };
  });

  const [start] = useState({ productId, savedAt, savedValues });
  const queue = useRef<SaveQueue | null>(null);

  // The queue is made on the first commit (never while rendering) and lives as long as the editor.
  const commit = useCallback(() => {
    const loose = form as unknown as LooseForm;
    queue.current ??= createAutosave({
      ...start,
      getValues: () => form.getValues(),
      send: saveProductAction,
      applyPatches: (patches) => {
        for (const { path, value } of patches) loose.setValue(path, value);
      },
      showErrors: (errors) => {
        form.clearErrors();
        for (const [path, message] of errors) loose.setError(path || "root", { type: "validate", message });
      },
      setState,
      onSaved: (saved) => callbacks.current.onSaved(saved),
      onSlugTaken: () => callbacks.current.onSlugTaken(),
      isOnline: () => navigator.onLine,
    });
    return queue.current.commit();
  }, [form, start]);

  return { state, commit };
}
