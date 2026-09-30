import type { StyleView } from "./product-details-data";

// The "Colour shown" and "Style" lines for the picked style (specs/product-editor-on-page.md). Pure, shared by the
// bullets under the description and the product details popup.

/**
 * What the lines say for the picked style (the first style when none is picked, the one "" style for a product
 * without styles): its colour shown, else its name; and its style number. null hides the line.
 */
export function styleLines(styles: readonly StyleView[], style: string | null, colors: readonly string[]) {
  const name = style ?? colors[0] ?? "";
  const row = styles.find((candidate) => candidate.color === name);
  return {
    colourShown: row?.colourShown?.trim() || name || null,
    code: row?.code || null,
  };
}
