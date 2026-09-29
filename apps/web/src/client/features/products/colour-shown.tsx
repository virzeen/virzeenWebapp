"use client";

import { useProductSelection } from "./product-selection";

/** The "Colour shown: {style}" bullet under the description: the style picked now (the first when none is). */
export function ColourShown() {
  const { style, colors } = useProductSelection();
  const shown = style ?? colors[0];
  return shown ? <li>Colour shown: {shown}</li> : null;
}
