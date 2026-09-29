"use client";

import type { ProductInput } from "@virzeen/validators";
import { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { ProductDetailsDialog } from "@/client/features/products/product-details-dialog";
import { ProductSelectionProvider } from "@/client/features/products/product-selection";
import { toPreviewProduct } from "../preview-draft";
import { useProductEditor } from "./editor-context";

/**
 * "View product details" and the shop's own popup (product-details-dialog.tsx), filled from the editor's current
 * values the way Preview fills it (toPreviewProduct): the picked style's photo, colour shown and style number, the
 * price customers pay, and every line the boxes below it hold.
 */
export function EditorDetailsDialog() {
  const { form, style, product } = useProductEditor();
  const values = useWatch({ control: form.control }) as ProductInput;
  const shown = useMemo(() => {
    const draft = { values, category: null, sizeGuide: null, productId: product.id };
    const preview = toPreviewProduct(draft);
    // Nothing ticked For sale yet: the popup's price still comes from the rows.
    if (preview.variants.length > 0) return preview;
    const rows = values.variants.map((row) => ({ ...row, isActive: true }));
    return toPreviewProduct({ ...draft, values: { ...values, variants: rows } });
  }, [values, product.id]);

  return (
    // Remounted when the editor picks another style: the popup follows the editor's pick, not its own.
    <ProductSelectionProvider
      key={style}
      variants={shown.variants}
      colors={shown.colors}
      sizes={shown.sizes}
      initialStyle={style || null}
      syncUrl={false}
    >
      <ProductDetailsDialog product={shown} />
    </ProductSelectionProvider>
  );
}
