"use client";

import { useFormState, useWatch } from "react-hook-form";
import { EditableText } from "./editable-text";
import { EditorCategory } from "./editor-category";
import { useProductEditor } from "./editor-context";
import { EditorPrice } from "./editor-price";
import { slugForName } from "./editor-slug";
import { featureAltResets } from "./features-cards";
import { photoAltResets } from "./made-alts";

/**
 * The top of the right column, as on the product page (product-details.tsx): the name (the page's h1), the category
 * under it and the price, each editable in place. From lg it sits right of the gallery; below lg above it.
 */
export function EditorHeader() {
  return (
    <div className="flex flex-col gap-1 lg:col-start-2 lg:row-start-1 lg:max-w-md">
      <EditorName />
      <EditorCategory />
      <EditorPrice />
    </div>
  );
}

/**
 * The name; while a never-published draft's slug follows its name, renaming changes the slug too. Photo and feature
 * picture descriptions made from the old name are cleared in the same save, so they're made again from the new one.
 */
function EditorName() {
  const { form, commitFields, slugFollowsName } = useProductEditor();
  const name = useWatch({ control: form.control, name: "name" });
  const { errors } = useFormState({ control: form.control, name: "name" });

  function rename(next: string) {
    const { slug, images, features } = form.getValues();
    return commitFields([
      { name: "name", value: next },
      ...(slugFollowsName ? [{ name: "slug" as const, value: slugForName(next, slug) }] : []),
      ...photoAltResets(images, (style) => ({ name, style })),
      ...featureAltResets(features, name),
    ]);
  }

  return (
    <EditableText label="Product name" value={name} error={errors.name?.message} onCommit={rename}>
      <h1 className="font-display text-h1">{name}</h1>
    </EditableText>
  );
}
