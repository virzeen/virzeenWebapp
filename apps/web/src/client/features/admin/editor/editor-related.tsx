"use client";

import { Grid } from "@virzeen/ui";
import { useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { ProductCard, type ProductCardData } from "@/client/features/products/product-card";
import { listRelatedByCategoryAction } from "@/server/actions/admin/catalog";
import { useProductEditor } from "./editor-context";

type Loaded = { categoryId: string; items: ProductCardData[] };
const NONE: ProductCardData[] = [];

/**
 * "You may also like" under the editor, as under the shop page and Preview (related-products.tsx): up to 4
 * published products of the picked category, without this one, read again when the category changes. Read-only:
 * the cards open in a new tab, so the editor stays open (and its leave check isn't asked). Nothing while loading,
 * when there are none, or when the read fails.
 */
export function EditorRelated() {
  const { form, product } = useProductEditor();
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const items = categoryId && loaded?.categoryId === categoryId ? loaded.items : NONE;

  useEffect(() => {
    if (!categoryId) return;
    let current = true;
    void listRelatedByCategoryAction({ categoryId, excludeId: product.id })
      .then((result) => {
        if (current) setLoaded({ categoryId, items: result.ok ? result.data : [] });
      })
      .catch(() => {
        if (current) setLoaded({ categoryId, items: [] });
      });
    return () => {
      current = false;
    };
  }, [categoryId, product.id]);

  // The shop's card is one link to its product page; here each opens in a new tab.
  useEffect(() => {
    gridRef.current?.querySelectorAll("a[href]").forEach((link) => link.setAttribute("target", "_blank"));
  }, [items]);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="editor-related-heading" className="flex flex-col gap-8 py-16">
      <div className="flex flex-col gap-1">
        <h2 id="editor-related-heading" className="font-display text-h2">
          You may also like
        </h2>
        <p className="text-small text-ink-muted">
          Published products in the same category, as customers see them. Each opens in a new tab.
        </p>
      </div>
      <Grid ref={gridRef} columns="products" gap={4}>
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </Grid>
    </section>
  );
}
