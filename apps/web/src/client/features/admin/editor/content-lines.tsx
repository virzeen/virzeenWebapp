"use client";

import { productSchema } from "@virzeen/validators";
import { useFormState, useWatch } from "react-hook-form";
import { linesError, toLines } from "../text-lines";
import { linesProblem } from "./content-helpers";
import { EditableText } from "./editable-text";
import { useProductEditor } from "./editor-context";

type BoxHeadingProps = { title: string; children: React.ReactNode };

/** A box's heading and what the product details popup will show. */
function BoxView({ title, children }: BoxHeadingProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-body font-medium">{title}</h2>
      {children}
    </div>
  );
}

type EditableLinesProps = {
  name: "details" | "benefits";
  /** The box's heading, e.g. "Product details". */
  title: string;
  /** Shown while the list is empty. */
  empty: string;
  rows: number;
};

/**
 * "Product details" or "Benefits" (specs/product-page.md): a list typed one per line, shown as its bullets with a
 * pencil. A line with a problem keeps the box open and says which line ("Line 3: …").
 */
export function EditableLines({ name, title, empty, rows }: EditableLinesProps) {
  const { form, commitField } = useProductEditor();
  const lines = useWatch({ control: form.control, name });
  const { errors } = useFormState({ control: form.control, name });
  const text = lines.join("\n");

  return (
    <EditableText
      label={`${title} (one per line)`}
      editLabel={title.toLowerCase()}
      multiline
      value={text}
      error={linesError(errors[name], text)}
      textareaProps={{ rows }}
      onCommit={(next) => linesProblem(productSchema.shape[name], next) ?? commitField(name, toLines(next))}
    >
      <BoxView title={title}>
        {lines.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1 pl-6 text-ink-muted">
            {lines.map((line, i) => (
              <li key={`${i}:${line}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{empty}</p>
        )}
      </BoxView>
    </EditableText>
  );
}

/** "Care": washing and care notes, shown in the popup as typed (line breaks kept). */
export function EditableCare() {
  const { form, commitField } = useProductEditor();
  const care = useWatch({ control: form.control, name: "care" }) ?? "";
  const { errors } = useFormState({ control: form.control, name: "care" });

  return (
    <EditableText
      label="Care"
      editLabel="care notes"
      multiline
      value={care}
      error={errors.care?.message}
      textareaProps={{ rows: 3 }}
      onCommit={(next) => commitField("care", next)}
    >
      <BoxView title="Care">
        <p className="whitespace-pre-line text-ink-muted">{care.trim() || "Add washing and care notes"}</p>
      </BoxView>
    </EditableText>
  );
}
