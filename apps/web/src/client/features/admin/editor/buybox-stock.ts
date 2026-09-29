import type { ProductInput } from "@virzeen/validators";
import { sameValue } from "../variant-options";

// Which variant row each size box of the editor's size grid edits (specs/product-editor-on-page.md "Sizes"). Pure.

type Row = Pick<ProductInput["variants"][number], "size" | "color" | "stock" | "isActive">;

/** One size box: its row's place in `variants` (-1 when there is none), sold out, and for sale. */
export type SizeCell = { size: string; index: number; soldOut: boolean; forSale: boolean };

/**
 * The row of a size ("" = the row of a product without sizes) for the picked style (null = the product has no
 * styles, any colour counts). A row for sale comes first; a switched-off one (sold before, then removed) otherwise.
 */
export function rowIndexFor(rows: readonly Row[], size: string, style: string | null): number {
  let found = -1;
  for (const [index, row] of rows.entries()) {
    if (!sameValue(row.size, size) || (style !== null && !sameValue(row.color, style))) continue;
    if (row.isActive) return index;
    if (found === -1) found = index;
  }
  return found;
}

/** The size boxes for the picked style, in the size list's order. Stock 0 (or blank) is sold out. */
export function sizeCells(rows: readonly Row[], sizes: readonly string[], style: string | null): SizeCell[] {
  return sizes.map((size) => {
    const index = rowIndexFor(rows, size, style);
    const row = rows[index];
    return {
      size,
      index,
      soldOut: !row || !(row.stock > 0),
      forSale: row?.isActive === true,
    };
  });
}

/** "Black, M"; "M" without styles; "Black" or "" without sizes: what a box's inputs are named after. */
export const cellName = (style: string | null, size: string) =>
  [style ?? "", size].filter(Boolean).join(", ");
