"use client";

import { useWatch } from "react-hook-form";
import { useProductEditor } from "./editor-context";

/**
 * "Shop / {main collection}" above the product, as the shop page shows it (product-details.tsx), but plain text: in the
 * editor it would only lead away from the product.
 */
export function EditorBreadcrumb() {
  const { form, options } = useProductEditor();
  const mainCollectionId = useWatch({ control: form.control, name: "mainCollectionId" });
  const collection = options.collections.find((option) => option.id === mainCollectionId);

  return (
    <p className="flex min-h-11 items-center gap-2 pb-3 text-small text-ink-muted">
      <span>Shop</span>
      <span aria-hidden>/</span>
      <span>{collection?.name ?? "No collection yet"}</span>
    </p>
  );
}
