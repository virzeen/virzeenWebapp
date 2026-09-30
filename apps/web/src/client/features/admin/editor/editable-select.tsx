"use client";

import { Button, cn, FormField, Select, type SelectOption } from "@virzeen/ui";
import { useEffect, useId, useRef, useState } from "react";
import { useEditDrafts } from "./edit-drafts";
import { coarsePointer, editLabelFor } from "./editable-text-keys";
import { EditableView } from "./editable-view";

export type EditableSelectProps = {
  /** The field's name, shown above the select while editing ("Category"). */
  label: string;
  /** What the pencil reads after "Edit"; defaults to the label ("Edit category"). */
  editLabel?: string;
  value: string;
  options: readonly SelectOption[];
  placeholder?: string;
  /** Saves the choice. Returns why it can't be used (shown under the select, which stays open), or null. */
  onCommit: (next: string) => string | null | Promise<string | null>;
  /** A problem from the last save (form state), shown under the text. */
  error?: string | undefined;
  /** More controls under the select while editing, e.g. "New category"; `close` ends the edit (focus → pencil). */
  extra?: (controls: { close: () => void }) => React.ReactNode;
  className?: string;
  /** The value as the page shows it (e.g. the category under the name). */
  children: React.ReactNode;
};

/**
 * A choice on the product page that edits in place: pencil (or double-click) → a Select; picking an option saves it
 * and closes. Escape, Cancel or leaving it closes without a change; focus goes back to the pencil.
 */
export function EditableSelect(props: EditableSelectProps) {
  const { label, editLabel, value, options, placeholder, error, extra, className, children } = props;
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pencilRef = useRef<HTMLButtonElement>(null);
  // Bumped when an edit ends by keyboard or a choice: focus goes back to the pencil once it's on screen again.
  const [focusPencil, setFocusPencil] = useState(0);
  const drafts = useEditDrafts();
  const id = useId();

  useEffect(() => {
    if (editing) triggerRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    if (focusPencil === 0) return;
    // After the select's list has closed and given focus back (to a trigger that's gone by then).
    const frame = requestAnimationFrame(() => pencilRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusPencil]);
  useEffect(() => () => drafts?.report(id, null), [drafts, id]);

  function close(refocus: boolean) {
    if (refocus && !coarsePointer()) setFocusPencil((count) => count + 1);
    setEditing(false);
    setProblem(null);
    drafts?.report(id, null);
  }

  async function choose(next: string) {
    if (next === value) return close(true);
    const found = await props.onCommit(next);
    if (!found) return close(true);
    setProblem(found);
    drafts?.report(id, found);
  }

  if (editing) {
    return (
      <div
        className={cn("flex flex-col gap-2", className)}
        // The select's list is portalled but its events bubble here: only keys and focus inside this box count.
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !event.currentTarget.contains(event.target as Node)) return;
          event.stopPropagation();
          close(true);
        }}
        onBlur={(event) => {
          const to = event.relatedTarget;
          if (!document.hasFocus() || event.currentTarget.contains(to)) return;
          // The list opening takes focus into itself.
          if (triggerRef.current?.dataset.state === "open") return;
          if (to instanceof Element && to.closest('[role="listbox"]')) return;
          if (!problem) close(false);
        }}
      >
        <FormField label={label} error={problem ?? error}>
          <Select
            ref={triggerRef}
            value={value}
            options={options}
            placeholder={placeholder}
            onValueChange={(next) => void choose(next)}
          />
        </FormField>
        {extra?.({ close: () => close(true) })}
        <Button variant="ghost" size="sm" shape="pill" className="self-start" onClick={() => close(true)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <EditableView
      editLabel={editLabel ?? editLabelFor(label)}
      onEdit={() => setEditing(true)}
      pencilRef={pencilRef}
      error={error}
      className={className}
    >
      {children}
    </EditableView>
  );
}
