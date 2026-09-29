"use client";

import type { ProductInput } from "@virzeen/validators";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { ImagesArray } from "./product-photos";
import {
  addOption,
  optionsFromRows,
  pricesDifferInAStyle,
  removeOption,
  renameOption,
  sameValue,
  sortRows,
  type OptionKind,
  type Options,
  type VariantRow,
} from "./variant-options";

type UseVariantOptions = {
  initialRows: readonly VariantRow[];
  savedAt: string | undefined;
  images: ImagesArray;
  onListChange: () => void;
};

/**
 * Sizes and styles for the product editor: the lists, the rows they make, and style photos that follow a rename or
 * removal (specs/product-styles.md). Rows change through the pure functions in variant-options.ts.
 */
export function useVariantOptions({ initialRows, savedAt, images, onListChange }: UseVariantOptions) {
  const form = useFormContext<ProductInput>();
  const variants = useFieldArray({ control: form.control, name: "variants", keyName: "fieldKey" });
  const [options, setOptions] = useState<Options>(() => optionsFromRows(initialRows));
  const [perRowPrices, setPerRowPrices] = useState(() => pricesDifferInAStyle(initialRows));
  const [editSkus, setEditSkus] = useState(false);
  // After a save the form reloads the saved rows; the size and style lists follow them. The ticked boxes stay.
  const [loadedAt, setLoadedAt] = useState(savedAt);
  if (savedAt !== loadedAt) {
    setLoadedAt(savedAt);
    setOptions(optionsFromRows(initialRows));
    if (pricesDifferInAStyle(initialRows)) setPerRowPrices(true);
  }

  /** Every row at one price (no styles). */
  function setAllPrices(paisa: number) {
    form.getValues("variants").forEach((_, index) =>
      form.setValue(`variants.${index}.pricePaisa`, paisa, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
    );
  }

  function change(kind: OptionKind, values: string[], add: boolean) {
    let rows = form.getValues("variants");
    let next = options;
    // A new style starts at the last style's price; new sizes at the first row's.
    const lastStyle = next.colors.at(-1);
    const price =
      (kind === "color" && lastStyle
        ? rows.find((row) => sameValue(row.color, lastStyle))?.pricePaisa
        : undefined) ?? form.getValues("variants.0.pricePaisa");
    const newRow = (size: string, color: string): VariantRow => ({
      sku: "",
      size,
      color,
      pricePaisa: price,
      stock: 0,
      isActive: true,
    });
    for (const value of values) {
      rows = add ? addOption(rows, kind, value, next, newRow) : removeOption(rows, kind, value, next);
      const list = kind === "size" ? next.sizes : next.colors;
      const updated = add ? [...list, value] : list.filter((known) => known !== value);
      next = kind === "size" ? { ...next, sizes: updated } : { ...next, colors: updated };
    }
    setOptions(next);
    variants.replace(sortRows(rows, next));
    onListChange();
  }

  /** Why a style name can't be used (blank, too long, taken), or null. */
  function styleNameProblem(name: string, except?: string) {
    if (!name) return "Enter a name for the style";
    if (name.length > 40) return "Keep the style name under 40 characters";
    if (options.colors.some((style) => style !== except && sameValue(style, name)))
      return "There's already a style with this name";
    return null;
  }

  function addStyle(raw: string) {
    const name = raw.trim();
    const problem = styleNameProblem(name);
    if (!problem) change("color", [name], true);
    return problem;
  }

  function renameStyle(from: string, raw: string) {
    const name = raw.trim();
    const problem = styleNameProblem(name, from);
    if (problem) return problem;
    variants.replace(renameOption(form.getValues("variants"), "color", from, name));
    images.replace(
      form
        .getValues("images")
        .map((image) => (sameValue(image.color, from) ? { ...image, color: name } : image)),
    );
    setOptions({ ...options, colors: options.colors.map((style) => (style === from ? name : style)) });
    onListChange();
    return null;
  }

  // Its photos go with it; with the last style gone the product has none, so its photos become shared ones.
  function removeStyle(style: string) {
    const last = options.colors.length === 1;
    change("color", [style], false);
    const photos = form.getValues("images");
    images.replace(
      last
        ? photos.map((image) => (sameValue(image.color, style) ? { ...image, color: "" } : image))
        : photos.filter((image) => !sameValue(image.color, style)),
    );
  }

  function choosePerRowPrices(on: boolean) {
    if (!on && options.colors.length === 0) setAllPrices(form.getValues("variants.0.pricePaisa"));
    if (!on) {
      // Each style back to one price: its first row's.
      for (const style of options.colors) {
        const rows = form.getValues("variants");
        const price = rows.find((row) => sameValue(row.color, style))?.pricePaisa;
        rows.forEach((row, index) => {
          if (price !== undefined && sameValue(row.color, style)) {
            form.setValue(`variants.${index}.pricePaisa`, price, { shouldDirty: true });
          }
        });
      }
    }
    setPerRowPrices(on);
  }

  return {
    variants,
    options,
    perRowPrices,
    choosePerRowPrices,
    editSkus,
    setEditSkus,
    setAllPrices,
    changeSizes: (values: string[], add: boolean) => change("size", values, add),
    addStyle,
    renameStyle,
    removeStyle,
  };
}
