import type { SizeChart } from "@virzeen/validators";
import { MAX_MEASUREMENTS, MAX_SIZES } from "./size-chart";

// Pasting a block copied from Excel or Google Sheets into the size table (specs/product-page-v2.md "Size guides").
// Pure functions: the grid reads the clipboard, these work out the next chart.

/**
 * A place in the size table grid. `row` -1 is the header row (the measurement names), 0 and up are the sizes;
 * `col` 0 is the Size column, 1 and up are the measurements.
 */
export type GridCell = { row: number; col: number };

export type PasteResult = {
  chart: SizeChart;
  /** Pasted cells with text in them that fell outside the table's limits (6 measurements, 20 sizes). */
  dropped: number;
  /** A whole copied table replaced the table (every box is new); otherwise cells were filled in. */
  replaced: boolean;
  /** Filled in: how many measurements and sizes the paste added at the end. */
  addedColumns: number;
  addedRows: number;
};

/** Plain split: rows by new lines, cells by tabs (the fallback for text that isn't quoted the spreadsheet way). */
const splitPlain = (text: string) => text.split(/\r\n|\r|\n/).map((line) => line.split("\t"));

/**
 * Reads copied spreadsheet cells: rows end with a new line, cells are split by tabs, and a cell holding a tab, a new
 * line or a quote comes wrapped in quotes ("" for a quote), as Excel and Google Sheets copy them. Each cell is
 * trimmed, with line breaks inside it turned into spaces. Empty rows at the end (the copy's last new line) and empty
 * columns on the right (a selection one column too wide) are left out, so they don't add blank sizes or
 * measurements.
 */
export function parseClipboardTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (char === '"') quoted = false;
      else cell += char;
      i += 1;
      continue;
    }
    if (char === '"' && cell === "") quoted = true;
    else if (char === "\t") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else cell += char;
    i += 1;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // An opening quote that never closed wasn't the spreadsheet's quoting: read the text as it is.
  const cells = quoted ? splitPlain(text) : rows;
  const tidy = cells.map((line) => line.map((value) => value.replace(/\s+/g, " ").trim()));
  while (tidy.length > 0 && tidy[tidy.length - 1]?.every((value) => value === "")) tidy.pop();
  const width = Math.max(0, ...tidy.map((line) => line.findLastIndex((value) => value !== "") + 1));
  return tidy.map((line) => line.slice(0, width));
}

/** More than one cell: a single value is left to the box's own paste. */
export const isCellBlock = (block: string[][]) => block.length > 1 || (block[0]?.length ?? 0) > 1;

// A number or a range ("96", "96.5", "96-101"): a value, not a measurement's name.
const AMOUNT = /^\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?$/;

// "Size", "Sizes", "SIZE (EU)": the heading of a copied Size column. Not a size that starts with the word ("Size 4").
const isSizeHeading = (text: string) => /^sizes?(?:\s*\([^)]*\))?$/i.test(text);

/** The grid's top-left corner: the "Size" heading, which has no box. */
const TOP_LEFT: GridCell = { row: -1, col: 0 };

/**
 * Where a block goes. A whole copied table, its headings and at least one size, replaces the table: its first cell
 * is a "Size" heading, or it's empty (the corner) with measurement names across the rest of the top row and the
 * block pasted into the names or the sizes. Just the headings ("Size" and the names) fill in the names, and just the
 * Size column with its heading fills in the sizes, from the top. Anything else fills in from the box it was pasted
 * into.
 */
function placeBlock(block: string[][], at: GridCell): { start: GridCell; replace: boolean } {
  const [top = [], ...below] = block;
  const corner = top[0] ?? "";
  const names = top.slice(1);
  if (isSizeHeading(corner)) return { start: TOP_LEFT, replace: names.length > 0 && below.length > 0 };
  const wholeTable =
    corner === "" &&
    below.length > 0 &&
    names.length > 0 &&
    names.every((name) => name !== "" && !AMOUNT.test(name)) &&
    (at.row === -1 || at.col === 0);
  return wholeTable ? { start: TOP_LEFT, replace: true } : { start: at, replace: false };
}

/** What a whole copied table replaces the table with before it's filled in: one blank box. */
const BLANK: SizeChart = { columns: [""], rows: [{ size: "", values: [""] }] };

/**
 * The chart after pasting `block` with its first cell at `at`, like a spreadsheet: pasted cells replace what's
 * there, and measurements and sizes are added at the end as needed, up to `limits`; cells past them are dropped.
 * A whole copied table (see placeBlock) replaces the table instead, wherever it was pasted: its top row gives the
 * measurement names and its first column the sizes, so no sizes are left over from before (e.g. a template's).
 */
export function pasteIntoChart(
  current: SizeChart,
  at: GridCell,
  block: string[][],
  limits = { columns: MAX_MEASUREMENTS, rows: MAX_SIZES },
): PasteResult {
  const { start, replace: replaced } = placeBlock(block, at);
  const chart = replaced ? BLANK : current;
  const widest = Math.max(0, ...block.map((line) => line.length));
  const columnsNeeded = start.col - 1 + widest;
  const rowsNeeded = start.row + block.length;
  const columnCount = Math.max(chart.columns.length, Math.min(columnsNeeded, limits.columns));
  const rowCount = Math.max(chart.rows.length, Math.min(rowsNeeded, limits.rows));

  const columns = Array.from({ length: columnCount }, (_, c) => chart.columns[c] ?? "");
  const rows = Array.from({ length: rowCount }, (_, r) => ({
    size: chart.rows[r]?.size ?? "",
    values: Array.from({ length: columnCount }, (_, c) => chart.rows[r]?.values[c] ?? ""),
  }));

  let dropped = 0;
  block.forEach((line, i) => {
    line.forEach((value, j) => {
      const r = start.row + i;
      const c = start.col + j;
      // The corner (the "Size" heading) has no box.
      if (r === -1 && c === 0) return;
      if (r >= rowCount || c - 1 >= columnCount) {
        if (value !== "") dropped += 1;
        return;
      }
      if (r === -1) {
        columns[c - 1] = value;
        return;
      }
      const size = rows[r];
      if (!size) return;
      if (c === 0) size.size = value;
      else size.values[c - 1] = value;
    });
  });

  return {
    chart: { columns, rows },
    dropped,
    replaced,
    addedColumns: replaced ? 0 : columnCount - chart.columns.length,
    addedRows: replaced ? 0 : rowCount - chart.rows.length,
  };
}
