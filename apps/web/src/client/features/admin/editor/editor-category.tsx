"use client";

import { useFormState, useWatch } from "react-hook-form";
import { EditableSelect } from "./editable-select";
import { useProductEditor } from "./editor-context";
import { NewCategoryField } from "./new-category-field";

/** The category under the name (the page's subtitle): pencil → a select, plus "New category" right there. */
export function EditorCategory() {
  const { form, options, commitField, addCategory } = useProductEditor();
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const { errors } = useFormState({ control: form.control, name: "categoryId" });
  const current = options.categories.find((category) => category.value === categoryId);

  return (
    <EditableSelect
      label="Category"
      value={categoryId}
      options={options.categories}
      placeholder="Choose a category"
      error={errors.categoryId?.message}
      onCommit={(next) => commitField("categoryId", next)}
      extra={({ close }) => (
        <NewCategoryField
          onAdded={(category) => {
            addCategory(category);
            const problem = commitField("categoryId", category.value);
            if (!problem) close();
            return problem;
          }}
        />
      )}
    >
      <p className="text-body text-ink-muted">{current?.label ?? "Choose a category"}</p>
    </EditableSelect>
  );
}
