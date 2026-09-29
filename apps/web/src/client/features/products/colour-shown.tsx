"use client";

import type { StyleView } from "./product-details-data";
import { useProductSelection } from "./product-selection";
import { styleLines } from "./style-number";

/**
 * The bullets under the description that follow the picked style (the first when none is picked):
 * "Colour shown: {colour shown}" and "Style: {style number}" (specs/product-editor-on-page.md). A missing value hides
 * its line.
 */
export function StyleBullets({ styles }: { styles: StyleView[] }) {
  const { style, colors } = useProductSelection();
  const { colourShown, code } = styleLines(styles, style, colors);
  return (
    <>
      {colourShown && <li>Colour shown: {colourShown}</li>}
      {code && <li>Style: {code}</li>}
    </>
  );
}
