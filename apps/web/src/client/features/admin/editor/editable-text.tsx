"use client";

import { cn, FormField, Input, Textarea, type InputProps, type TextareaProps } from "@virzeen/ui";
import { useEffect, useId, useRef, useState } from "react";
import { useEditDrafts } from "./edit-drafts";
import { editKeyAction, editLabelFor, hasChanged, keyPress, normalizeDraft } from "./editable-text-keys";
import { EditableView } from "./editable-view";

type OwnInputProps = "value" | "defaultValue" | "onChange" | "onKeyDown" | "onBlur" | "ref";

export type EditableTextProps = {
  /** The field's name, shown above the box while editing ("Product name"). */
  label: string;
  /** What the pencil reads after "Edit"; defaults to the label ("Edit product name"). */
  editLabel?: string;
  value: string;
  /**
   * Saves the new text (already trimmed; only called when it changed). Returns why it can't be used, shown under the
   * box, which stays open; or null, and the box closes.
   */
  onCommit: (next: string) => string | null | Promise<string | null>;
  /** A textarea (Enter makes a new line) instead of a one-line box. */
  multiline?: boolean;
  /** Shown instead of the text when it's blank, e.g. "Add a description". */
  placeholder?: string;
  /** A problem from the last save (form state), shown under the text. */
  error?: string | undefined;
  inputProps?: Omit<InputProps, OwnInputProps>;
  textareaProps?: Omit<TextareaProps, OwnInputProps>;
  className?: string;
  /** The text as the page shows it (the h1, a price); defaults to the value, or the placeholder when it's blank. */
  children?: React.ReactNode;
};

/**
 * Text on the product page that edits in place (specs/product-editor-on-page.md "Editing model"): a pencil beside
 * it; double-click the text or press the pencil for a box with the text selected. Enter (one line), Ctrl+Enter or
 * clicking/tabbing outside saves; Escape cancels. After Enter or Escape focus goes back to the pencil.
 */
export function EditableText(props: EditableTextProps) {
  const { label, editLabel, value, multiline = false, placeholder, error, className, children } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [problem, setProblem] = useState<string | null>(null);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const refocusPencil = useRef(false);
  // Set as soon as the edit ends: the box's blur when it's removed (Chrome) must not save a cancelled draft.
  const open = useRef(false);
  const busy = useRef(false);
  const drafts = useEditDrafts();
  const id = useId();

  useEffect(() => {
    const field = inputRef.current ?? textareaRef.current;
    if (editing) {
      field?.focus();
      field?.select();
    } else if (refocusPencil.current) {
      refocusPencil.current = false;
      pencilRef.current?.focus();
    }
  }, [editing]);
  // A field that goes away (its style or row was removed) no longer holds anything back.
  useEffect(() => () => drafts?.report(id, null), [drafts, id]);

  function start() {
    open.current = true;
    setDraft(value);
    setProblem(null);
    setEditing(true);
  }

  function close(refocus: boolean) {
    open.current = false;
    refocusPencil.current = refocus;
    setEditing(false);
    setProblem(null);
    drafts?.report(id, null);
  }

  async function finish(refocus: boolean) {
    if (busy.current || !open.current) return;
    if (!hasChanged(draft, value, multiline)) return close(refocus);
    busy.current = true;
    let found: string | null;
    try {
      found = await props.onCommit(normalizeDraft(draft, multiline));
    } catch {
      found = "Something went wrong on our side. Please try again.";
    } finally {
      busy.current = false;
    }
    if (!found) return close(refocus);
    setProblem(found);
    drafts?.report(id, found);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const action = editKeyAction(keyPress(event, multiline));
    if (!action) return;
    event.preventDefault();
    event.stopPropagation(); // Escape here cancels the edit, not a surrounding popup
    if (action === "commit") void finish(true);
    else close(true);
  }

  // Switching to another window isn't leaving the field: keep editing.
  const onBlur = () => {
    if (document.hasFocus()) void finish(false);
  };

  if (editing) {
    const field = { value: draft, onKeyDown, onBlur };
    return (
      <div className={className}>
        <FormField
          label={label}
          error={problem ?? error}
          helper={multiline ? "Saves when you click outside. Esc cancels." : "Enter saves, Esc cancels."}
        >
          {multiline ? (
            <Textarea
              {...props.textareaProps}
              {...field}
              ref={textareaRef}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <Input
              autoComplete="off"
              {...props.inputProps}
              {...field}
              ref={inputRef}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}
        </FormField>
      </div>
    );
  }

  return (
    <EditableView
      editLabel={editLabel ?? editLabelFor(label)}
      onEdit={start}
      pencilRef={pencilRef}
      error={error}
      className={className}
    >
      {value.trim() === "" && placeholder ? (
        <p className="text-ink-muted">{placeholder}</p>
      ) : (
        (children ?? <p className={cn(multiline && "whitespace-pre-line")}>{value}</p>)
      )}
    </EditableView>
  );
}
