import type { ProductInput } from "@virzeen/validators";

// Sizes × colours → variant rows for the product editor (specs/admin-product-editor.md "Price, sizes, colours, stock").
// Pure functions: the form keeps the rows, these work out the next ones.

export type VariantRow = ProductInput["variants"][number];
export type OptionKind = "size" | "color";
export type Options = { sizes: string[]; colors: string[] };

const clean = (value: string | undefined) => (value ?? "").trim();
export const sameValue = (a: string | undefined, b: string | undefined) =>
  clean(a).toLowerCase() === clean(b).toLowerCase();

const listOf = (options: Options, kind: OptionKind) => (kind === "size" ? options.sizes : options.colors);
const otherKind = (kind: OptionKind): OptionKind => (kind === "size" ? "color" : "size");

/** The sizes and colours of the rows for sale, in the order they first appear. */
export function optionsFromRows(rows: readonly VariantRow[]): Options {
  const collect = (kind: OptionKind) => {
    const values: string[] = [];
    for (const row of rows) {
      const value = clean(row[kind]);
      if (row.isActive && value && !values.some((known) => sameValue(known, value))) values.push(value);
    }
    return values;
  };
  return { sizes: collect("size"), colors: collect("color") };
}

/** "Black, M"; "Standard" for a product with neither. */
export const variantLabel = (row: Pick<VariantRow, "size" | "color">) =>
  [clean(row.color), clean(row.size)].filter(Boolean).join(", ") || "Standard";

/**
 * Rows after adding `value` to sizes or colours (`options` are the values before it). The first size (or colour)
 * goes onto the rows there are; after that, each combination with the other values gets a row, reusing a row that
 * already has it (a saved one switched off earlier is switched back on).
 */
export function addOption(
  rows: readonly VariantRow[],
  kind: OptionKind,
  value: string,
  options: Options,
  newRow: (size: string, color: string) => VariantRow,
): VariantRow[] {
  if (listOf(options, kind).length === 0 && rows.some((row) => !clean(row[kind]))) {
    return rows.map((row) => (clean(row[kind]) ? row : { ...row, [kind]: value }));
  }
  const next = [...rows];
  const others = listOf(options, otherKind(kind));
  for (const other of others.length > 0 ? others : [""]) {
    const size = kind === "size" ? value : other;
    const color = kind === "color" ? value : other;
    const index = next.findIndex((row) => sameValue(row.size, size) && sameValue(row.color, color));
    const found = next[index];
    if (found) next[index] = { ...found, isActive: true };
    else next.push(newRow(size, color));
  }
  return next;
}

/**
 * Rows after removing `value` from sizes or colours. Unsaved rows go; saved rows stay, switched off, because past
 * orders use them. Removing the last size (or colour) clears it from the rows instead, unless that would repeat
 * another row.
 */
export function removeOption(
  rows: readonly VariantRow[],
  kind: OptionKind,
  value: string,
  options: Options,
): VariantRow[] {
  const isLast = listOf(options, kind).every((known) => sameValue(known, value));
  const next: VariantRow[] = [];
  for (const row of rows) {
    if (!sameValue(row[kind], value)) {
      next.push(row);
      continue;
    }
    const cleared = { ...row, [kind]: "" };
    const repeats = rows.some(
      (other) =>
        other !== row && sameValue(other.size, cleared.size) && sameValue(other.color, cleared.color),
    );
    if (isLast && !repeats) next.push(cleared);
    else if (row.id) next.push({ ...row, isActive: false });
  }
  return next;
}

/** Rows in the order of the colour and size lists; rows with values not in the lists keep their order at the end. */
export function sortRows(rows: readonly VariantRow[], options: Options): VariantRow[] {
  const rank = (list: string[], value: string | undefined) => {
    if (!clean(value)) return -1;
    const index = list.findIndex((known) => sameValue(known, value));
    return index === -1 ? list.length : index;
  };
  const key = (row: VariantRow) => [rank(options.colors, row.color), rank(options.sizes, row.size)] as const;
  return rows
    .map((row, index) => ({ row, index, key: key(row) }))
    .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.index - b.index)
    .map((entry) => entry.row);
}

/** True when the rows don't all have the same product price (the editor then shows a price per row). */
export const pricesDiffer = (rows: readonly VariantRow[]) =>
  rows.some((row) => !Object.is(row.pricePaisa, rows[0]?.pricePaisa));

/** Rows after renaming a size or colour (style) everywhere it's used; the caller checks `to` is new and not blank. */
export const renameOption = (rows: readonly VariantRow[], kind: OptionKind, from: string, to: string) =>
  rows.map((row) => (sameValue(row[kind], from) ? { ...row, [kind]: to } : row));

/** True when some style has different prices for its sizes (styles may differ from each other: that's their price). */
export function pricesDifferInAStyle(rows: readonly VariantRow[]) {
  const byStyle = new Map<string, VariantRow[]>();
  for (const row of rows) {
    const style = clean(row.color).toLowerCase();
    byStyle.set(style, [...(byStyle.get(style) ?? []), row]);
  }
  return [...byStyle.values()].some(pricesDiffer);
}

/**
 * A style's line in the editor's list: its lowest and highest price (null before one is typed), the stock of its
 * sizes for sale, and whether any size is for sale. Prices of switched-off sizes count only when none is for sale.
 */
export function styleSummary(rows: readonly VariantRow[], style: string) {
  const own = rows.filter((row) => sameValue(row.color, style));
  const forSale = own.filter((row) => row.isActive);
  const prices = (forSale.length > 0 ? forSale : own)
    .map((row) => row.pricePaisa)
    .filter((paisa) => Number.isFinite(paisa));
  return {
    minPaisa: prices.length > 0 ? Math.min(...prices) : null,
    maxPaisa: prices.length > 0 ? Math.max(...prices) : null,
    stock: forSale.reduce((sum, row) => sum + (Number.isFinite(row.stock) ? row.stock : 0), 0),
    forSale: forSale.length > 0,
  };
}
