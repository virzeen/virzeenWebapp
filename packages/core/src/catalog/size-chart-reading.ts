import { sizeChartSchema, type SizeChart, type SizeChartReading } from "@virzeen/validators";
import { AppError } from "../errors";

// Turns the picture reader's reply into a size table (specs/size-chart-from-picture.md). Pure: the outside call to
// Google is the web app's adapter; everything the reply is allowed to become is decided here.

/** The table's limits (`sizeChartSchema`; a test keeps them in step). */
const MAX_COLUMNS = 6;
const MAX_ROWS = 20;
const MAX_NAME = 30;
const MAX_SIZE = 20;
const MAX_VALUE = 20;
const MAX_NOTE = 500;
/** Most left-out headings the notice names. */
const MAX_SKIPPED = 5;

/** Customer-facing wording for the admin (copy in docs/ui/content-style.md). */
export const PICTURE_READING_MESSAGES = {
  notAChart: "This doesn't look like a size chart. Try a clearer picture.",
  inches: "This chart is in inches, but the table uses cm. Convert it first.",
  couldntRead: "Couldn't read the picture. Try again, or type the table.",
  busy: "Reading pictures is busy right now. Try again in a minute, or type the table.",
} as const;

export type ChartReadingResult = {
  chart: SizeChart;
  /** Headings of columns that aren't measurements (Weight…), left out. At most 5, each cut to 30 characters. */
  skipped: string[];
  /** The picture doesn't say its unit: the numbers were taken as cm. */
  unitUnknown: boolean;
  /** Values that weren't a number or range, left blank. */
  blankedValues: number;
  /** Measurements and sizes past the table's limits (6 and 20), left out. */
  cutColumns: number;
  cutRows: number;
  /** The picture holds more than one table: only the first was read. */
  multipleTables: boolean;
  /** The chart's own footnote in English, up to 500 characters; empty when there is none. */
  note: string;
};

/** Plain, comparable text: full-width characters made ordinary, runs of spaces made one, trimmed. */
const tidy = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();

/** At most `max` UTF-16 units without splitting a character. */
function cut(text: string, max: number): string {
  let out = "";
  for (const char of text) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out;
}

const AMOUNT = /^\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?$/;
// How a supplier writes "doesn't apply".
const NOT_APPLICABLE = /^(?:[-–—/*]+|n\/a|na|无)$/i;

/**
 * A cell as a table value: a number or a range ("96", "96.5", "96-101"), with "~", "–" and "to" ranges written with
 * a hyphen and "cm" dropped. "" for an empty cell or one that says "doesn't apply"; null for anything else (the
 * value couldn't be read).
 */
export function normaliseValue(raw: string): string | null {
  const text = tidy(raw).toLowerCase();
  if (text === "" || NOT_APPLICABLE.test(text)) return "";
  const plain = text
    .replace(/\s*cm\.?/g, "")
    .replace(/\s+to\s+/g, "-")
    .replace(/\s*[~–—‒]\s*/g, "-")
    .replace(/\s*-\s*/g, "-");
  return AMOUNT.test(plain) && plain.length <= MAX_VALUE ? plain : null;
}

const unique = (items: string[]) => [...new Set(items)];

/**
 * The size table (and what to tell the admin) for the reader's reply. Throws VALIDATION_FAILED, with wording the admin
 * sees, when the picture isn't a size chart or is in inches (nothing is guessed or converted).
 *
 * Names and sizes are tidied and cut to the table's lengths; a column whose heading came back empty is dropped; a
 * row without a size is dropped; rows are padded or cut to the columns; values that aren't numbers or ranges are left
 * blank and counted; more than 6 measurements or 20 sizes are cut and counted. Two measurements (or sizes) with the
 * same name are kept: the grid says so on Save, as it does for typed ones.
 */
export function interpretChartReading(reading: SizeChartReading): ChartReadingResult {
  if (!reading.readable) throw new AppError("VALIDATION_FAILED", PICTURE_READING_MESSAGES.notAChart);
  if (reading.unit === "in") throw new AppError("VALIDATION_FAILED", PICTURE_READING_MESSAGES.inches);

  const names = reading.columns.map((name) => cut(tidy(name), MAX_NAME));
  const present = names.flatMap((name, index) => (name === "" ? [] : [index]));
  const kept = present.slice(0, MAX_COLUMNS);

  const sized = reading.rows
    .map((row) => ({ size: cut(tidy(row.size), MAX_SIZE), values: row.values }))
    .filter((row) => row.size !== "");
  const used = sized.slice(0, MAX_ROWS);

  let blankedValues = 0;
  const chart: SizeChart = {
    columns: kept.map((index) => names[index] as string),
    rows: used.map((row) => ({
      size: row.size,
      values: kept.map((index) => {
        const value = normaliseValue(row.values[index] ?? "");
        if (value === null) {
          blankedValues += 1;
          return "";
        }
        return value;
      }),
    })),
  };
  if (chart.columns.length === 0 || chart.rows.length === 0)
    throw new AppError("VALIDATION_FAILED", PICTURE_READING_MESSAGES.notAChart);

  // Everything above keeps to the schema's limits, so only a repeated name may fail it (left for the grid to show).
  const checked = sizeChartSchema.safeParse(chart);
  if (!checked.success && !checked.error.issues.every((issue) => /same name/.test(issue.message)))
    throw new AppError("INTERNAL", PICTURE_READING_MESSAGES.couldntRead);

  return {
    chart,
    skipped: unique(reading.skipped.map((name) => cut(tidy(name), MAX_NAME)).filter(Boolean)).slice(
      0,
      MAX_SKIPPED,
    ),
    unitUnknown: reading.unit === "unknown",
    blankedValues,
    cutColumns: present.length - kept.length,
    cutRows: sized.length - used.length,
    multipleTables: reading.multipleTables,
    note: cut(tidy(reading.note), MAX_NOTE),
  };
}
