"use client";

import { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import {
  NO_RECOMMENDATIONS,
  RelatedProducts,
  type RecommendationsView,
} from "@/client/features/products/related-products";
import { listRecommendationsAction } from "@/server/actions/admin/catalog";
import { useProductEditor } from "./editor-context";

type Loaded = { collectionId: string; recommendations: RecommendationsView };

/**
 * The carousels under the editor, as under the shop page and Preview (related-products.tsx): "You may also like"
 * (published products of the main collection, without this one) and "More from Virzeen" (the other collections), read
 * again when the main collection changes. Read-only: the cards open in a new tab, so the editor stays open (and its leave
 * check isn't asked). Nothing while loading, when there are none, or when the read fails.
 */
export function EditorRelated() {
  const { form, product } = useProductEditor();
  const collectionId = useWatch({ control: form.control, name: "mainCollectionId" });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const recommendations =
    collectionId && loaded?.collectionId === collectionId ? loaded.recommendations : NO_RECOMMENDATIONS;

  useEffect(() => {
    if (!collectionId) return;
    let current = true;
    void listRecommendationsAction({ collectionId, excludeId: product.id })
      .then((result) => {
        if (current)
          setLoaded({ collectionId, recommendations: result.ok ? result.data : NO_RECOMMENDATIONS });
      })
      .catch(() => {
        if (current) setLoaded({ collectionId, recommendations: NO_RECOMMENDATIONS });
      });
    return () => {
      current = false;
    };
  }, [collectionId, product.id]);

  return <RelatedProducts recommendations={recommendations} inEditor />;
}
