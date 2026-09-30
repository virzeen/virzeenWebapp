import { MAX_FEATURE_ROWS, type FeatureRow, type FeatureRowShape } from "@virzeen/validators";
import { moveItem, removeAt } from "./features-cards";

// The pure parts of the Custom layout's rows editor (specs/product-page-v2.md "Custom"): each change gives the whole
// new list, which the editor saves at once through commitField("featureRows", rows).

/** How many pictures a row can hold, in the editor's order. */
export const ROW_COUNTS = [1, 2, 3, 4] as const;
export type RowCount = (typeof ROW_COUNTS)[number];

/** "+ Add row" adds 2 portrait pictures. */
export const newFeatureRow = (): FeatureRow => ({ count: 2, shape: "PORTRAIT" });

/** The rows with a new one at the end; unchanged when they are full (9). */
export const addRow = (rows: readonly FeatureRow[]): FeatureRow[] =>
  rows.length >= MAX_FEATURE_ROWS ? [...rows] : [...rows, newFeatureRow()];

/** The rows with the one at `index` moved up (-1) or down (1); unchanged at the ends. */
export const moveRow = (rows: readonly FeatureRow[], index: number, by: 1 | -1): FeatureRow[] =>
  moveItem(rows, index, index + by);

export const removeRow = (rows: readonly FeatureRow[], index: number): FeatureRow[] => removeAt(rows, index);

/** The rows with one row changed: how many pictures it holds, or their shape. */
export function changeRow(
  rows: readonly FeatureRow[],
  index: number,
  change: { count: RowCount } | { shape: FeatureRowShape },
): FeatureRow[] {
  return rows.map((row, at) => (at === index ? { ...row, ...change } : row));
}

/** A radio value ("1" to "4") as a row count, or null. */
export const rowCountOf = (value: string): RowCount | null =>
  ROW_COUNTS.find((count) => String(count) === value) ?? null;

const pictures = (count: number) => `${count} ${count === 1 ? "picture" : "pictures"}`;

/**
 * The line under the rows: how many pictures the rows hold against how many features there are ("These rows hold 5
 * pictures. You have 7."). The shop repeats the last row for the rest, so a mismatch is fine.
 */
export function rowsHoldLine(rows: readonly FeatureRow[], features: number): string {
  if (rows.length === 0) return "No rows yet, so the features show as Three across.";
  const holds = rows.reduce((sum, row) => sum + row.count, 0);
  const start =
    rows.length === 1 ? `This row holds ${pictures(holds)}.` : `These rows hold ${pictures(holds)}.`;
  return `${start} You have ${features}.`;
}
