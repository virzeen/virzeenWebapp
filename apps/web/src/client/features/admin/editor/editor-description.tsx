"use client";

import { useFormState, useWatch } from "react-hook-form";
import { OriginBulletEditor, StyleBulletsEditor } from "./content-bullets";
import { EditableText } from "./editable-text";
import { useProductEditor } from "./editor-context";

/**
 * The description under the buttons, as the shop shows it (product-description.tsx: plain text, line breaks kept),
 * with a pencil (textarea); then the bullets for the picked style: "Colour shown" (pencil), "Style: {style number}"
 * (read-only) and "Country/Region of origin" (pencil). Each saves by itself. Drafts may leave the description blank;
 * publishing needs one.
 */
export function EditorDescription() {
  const { form, commitField } = useProductEditor();
  const description = useWatch({ control: form.control, name: "description" });
  const { errors } = useFormState({ control: form.control, name: "description" });

  return (
    <div className="flex flex-col gap-4 text-body">
      <EditableText
        label="Description"
        multiline
        value={description}
        placeholder="Add a description"
        error={errors.description?.message}
        textareaProps={{ rows: 6 }}
        onCommit={(next) => commitField("description", next)}
      />
      <ul className="flex list-disc flex-col gap-1 pl-6">
        <StyleBulletsEditor />
        <OriginBulletEditor />
      </ul>
    </div>
  );
}
