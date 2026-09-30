"use client";

import type { ProductInput } from "@virzeen/validators";
import { createContext, useContext } from "react";
import type { Path, PathValue, UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import type { SizeGuideView } from "@/client/features/products/product-details-data";
import type { ImagesArray, useVariantOptions } from "../use-variant-options";
import type { SaveState } from "./autosave-queue";

export type CategoryOption = { value: string; label: string; slug?: string };

export type EditorOptions = {
  categories: CategoryOption[];
  collections: { id: string; name: string }[];
  /** Active size guides, whole, so Preview's Size guide popup can show the picked one. */
  sizeGuides: (SizeGuideView & { id: string })[];
  uploadsEnabled: boolean;
};

/** The product as last saved (the form holds what the next save sends). */
export type EditorProduct = {
  id: string;
  /** Product number: the 0042 in style numbers like VZ0042-101. */
  number: number;
  slug: string;
  isPublished: boolean;
  /** Published at least once (kept after Unpublish): the slug no longer follows the name. */
  everPublished: boolean;
  /** Last save (ISO). */
  savedAt: string;
};

export type VariantsArray = UseFieldArrayReturn<ProductInput, "variants", "fieldKey">;
export type VariantOptions = ReturnType<typeof useVariantOptions>;
/** One edit for commitFields: a form path and its new value. */
export type EditorChange = { name: Path<ProductInput>; value: unknown };

export type ProductEditor = {
  form: UseFormReturn<ProductInput>;
  /** The one `images` field array (every style's photos and the shared ones). */
  images: ImagesArray;
  /** The one `variants` field array (same object as variantOptions.variants). */
  variants: VariantsArray;
  /** Sizes × styles rows (use-variant-options.ts); its list changes already save. */
  variantOptions: VariantOptions;
  /** The product's styles in order (variant colours for sale); empty when it has none. */
  styles: string[];
  /** The picked style: the gallery, price, sizes and colour shown follow it. "" when the product has no styles. */
  style: string;
  selectStyle: (style: string) => void;
  options: EditorOptions;
  /** Adds a category made in the editor to `options.categories` (the page's list catches up after a refresh). */
  addCategory: (category: CategoryOption) => void;
  product: EditorProduct;
  /** While on, a name change also changes the slug (a draft never published, slug not typed by hand). */
  slugFollowsName: boolean;
  /** Settings → URL slug typed by hand: the slug stops following the name. */
  stopSlugFollowingName: () => void;
  /** What the top bar shows. "invalid" also while a field is open with a problem. */
  save: SaveState;
  /** Saves the product as the form holds it now (after an edit that already set its values). */
  commit: () => Promise<void>;
  /**
   * Checks one edit against the whole product first: returns the problem on that field (the value is not set, show
   * it under the field) or null (the value is set and the product saves).
   */
  commitField: <P extends Path<ProductInput>>(name: P, value: PathValue<ProductInput, P>) => string | null;
  /** commitField for several paths at once (e.g. one price on every row of a style). */
  commitFields: (changes: readonly EditorChange[]) => string | null;
  /** Try again after "Couldn't save". */
  retry: () => void;
};

export const ProductEditorContext = createContext<ProductEditor | null>(null);

/** The product editor's form, lists, picked style, options and autosave. Inside ProductEditorProvider only. */
export function useProductEditor(): ProductEditor {
  const editor = useContext(ProductEditorContext);
  if (!editor) throw new Error("useProductEditor must be used inside ProductEditorProvider");
  return editor;
}
