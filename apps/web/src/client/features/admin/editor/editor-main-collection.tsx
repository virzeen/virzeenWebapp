"use client";

import { useFormState, useWatch } from "react-hook-form";
import { EditableSelect } from "./editable-select";
import { useProductEditor } from "./editor-context";
import { NewCollectionField } from "./new-collection-field";

/**
 * The main collection under the name (the page's subtitle, the old "category"): pencil → a select, plus
 * "New collection" right there. The main collection is always one of the product's collections.
 */
export function EditorMainCollection() {
  const { form, options, commitFields, addCollection } = useProductEditor();
  const mainCollectionId = useWatch({ control: form.control, name: "mainCollectionId" });
  const { errors } = useFormState({ control: form.control, name: "mainCollectionId" });
  const current = options.collections.find((collection) => collection.id === mainCollectionId);

  /** Picks it as the main one and makes sure it is among the product's collections. */
  const pick = (id: string) => {
    const ids = form.getValues("collectionIds");
    return commitFields([
      { name: "mainCollectionId", value: id },
      { name: "collectionIds", value: ids.includes(id) ? ids : [...ids, id] },
    ]);
  };

  return (
    <EditableSelect
      label="Main collection"
      value={mainCollectionId}
      options={options.collections.map((collection) => ({ value: collection.id, label: collection.name }))}
      placeholder="Choose a main collection"
      error={errors.mainCollectionId?.message}
      onCommit={pick}
      extra={({ close }) => (
        <NewCollectionField
          onAdded={(collection) => {
            addCollection(collection);
            const problem = pick(collection.id);
            if (!problem) close();
            return problem;
          }}
        />
      )}
    >
      <p className="text-body text-ink-muted">{current?.name ?? "Choose a main collection"}</p>
    </EditableSelect>
  );
}
