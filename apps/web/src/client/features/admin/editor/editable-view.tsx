"use client";

import { cn } from "@virzeen/ui";
import { EDITABLE_GROUP, EditPencil } from "./edit-pencil";

type EditableViewProps = {
  /** The pencil reads "Edit {editLabel}". */
  editLabel: string;
  onEdit: () => void;
  pencilRef: React.Ref<HTMLButtonElement>;
  /** A problem from the last save, under the text (Show in the top bar can focus it). */
  error?: string | undefined;
  className?: string;
  children: React.ReactNode;
};

/**
 * Editable content when it isn't being edited (EditableText, EditableSelect): the content as the page shows it with
 * the pencil beside it. Double-clicking the content edits it too (a mouse shortcut; the pencil is the way in for
 * keyboard and touch).
 */
export function EditableView({
  editLabel,
  onEdit,
  pencilRef,
  error,
  className,
  children,
}: EditableViewProps) {
  return (
    <div className={cn(EDITABLE_GROUP, "flex flex-col gap-1", className)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1" onDoubleClick={onEdit}>
          {children}
        </div>
        <EditPencil ref={pencilRef} label={editLabel} className="-my-1" onClick={onEdit} />
      </div>
      {error && (
        <p className="text-small text-danger" data-field-error tabIndex={-1}>
          {error}
        </p>
      )}
    </div>
  );
}
