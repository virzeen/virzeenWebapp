"use client";

import { useWatch } from "react-hook-form";
import { useProductEditor } from "./editor-context";

/**
 * "Shop / {category}" above the product, as the shop page shows it (product-details.tsx), but plain text: in the
 * editor it would only lead away from the product.
 */
export function EditorBreadcrumb() {
  const { form, options } = useProductEditor();
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const category = options.categories.find((option) => option.value === categoryId);

  return (
    <p className="flex min-h-11 items-center gap-2 pb-3 text-small text-ink-muted">
      <span>Shop</span>
      <span aria-hidden>/</span>
      <span>{category?.label ?? "No category yet"}</span>
    </p>
  );
}
