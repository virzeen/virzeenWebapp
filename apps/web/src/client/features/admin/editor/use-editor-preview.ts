"use client";

import { useCallback, useEffect, useRef } from "react";
import { previewUrl, writePreviewDraft } from "../preview-draft";
import { slugify } from "../slugify";
import { useProductEditor } from "./editor-context";

/**
 * Preview (specs/admin-product-editor.md "Preview"): hands the editor's values to the preview tab through
 * localStorage when it opens, then again 250ms after every change, so the tab follows the editor. Returns the
 * function that opens (or brings back) the tab.
 */
export function useEditorPreview() {
  const { form, options, product } = useProductEditor();
  const previewing = useRef(false);
  const { categories, sizeGuides } = options;

  const handOver = useCallback(() => {
    const values = form.getValues();
    const category = categories.find((option) => option.value === values.categoryId);
    const sizeGuide = sizeGuides.find((guide) => guide.id === values.sizeGuideId);
    writePreviewDraft(product.id, {
      values,
      category: category
        ? { id: category.value, name: category.label, slug: category.slug ?? slugify(category.label) }
        : null,
      sizeGuide: sizeGuide ?? null,
      productId: product.id,
    });
  }, [form, categories, sizeGuides, product.id]);

  // One subscription for the editor's life: every save re-renders the editor and makes a new handOver, and
  // re-subscribing then would cancel the pending hand-over, so the preview tab never heard of the change.
  const latestHandOver = useRef(handOver);
  useEffect(() => {
    latestHandOver.current = handOver;
  });
  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        if (!previewing.current) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => latestHandOver.current(), 250);
      },
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [form]);

  return () => {
    previewing.current = true;
    handOver();
    window.open(previewUrl(product.id), `virzeen-preview-${product.id}`);
  };
}
