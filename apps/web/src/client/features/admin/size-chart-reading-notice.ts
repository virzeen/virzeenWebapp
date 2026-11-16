import { MAX_MEASUREMENTS, MAX_SIZES } from "./size-chart";

// What the admin is told after "Fill from a picture" has filled in the table (specs/size-chart-from-picture.md; the
// wording is in docs/ui/content-style.md). Only our own sentences and the headings the reader left out (escaped by
// React, cut to 30 characters by core): nothing else the reader wrote is shown.

export const READING_COPY = {
  wrongType: "Choose a JPG, PNG or WebP picture.",
  tooBig: "That picture is too big. Try a smaller one.",
  couldntRead: "Couldn't read the picture. Try again, or type the table.",
  filled: "Table filled in from the picture",
  check: "Check every number against the picture before you save.",
} as const;

/** What `interpretChartReading` reports besides the table. */
export type ReadingSummary = {
  skipped: string[];
  unitUnknown: boolean;
  blankedValues: number;
  cutColumns: number;
  cutRows: number;
  multipleTables: boolean;
};

const many = (count: number, one: string, other: string) => `${count} ${count === 1 ? one : other}`;

/** The lines under the grid: always "check every number", then whatever applies. */
export function readingNotice(summary: ReadingSummary, addedNote: boolean): string[] {
  const lines: string[] = [READING_COPY.check];
  if (summary.skipped.length > 0) lines.push(`Left out: ${summary.skipped.join(", ")}.`);
  if (summary.unitUnknown) lines.push("The picture doesn't show a unit, so the numbers were read as cm.");
  if (summary.blankedValues > 0)
    lines.push(
      `${many(summary.blankedValues, "value couldn't", "values couldn't")} be read and ${
        summary.blankedValues === 1 ? "was" : "were"
      } left blank.`,
    );
  if (summary.cutColumns > 0)
    lines.push(
      `${many(summary.cutColumns, "measurement was", "measurements were")} left out: the table holds up to ${MAX_MEASUREMENTS}.`,
    );
  if (summary.cutRows > 0)
    lines.push(
      `${many(summary.cutRows, "size was", "sizes were")} left out: the table holds up to ${MAX_SIZES}.`,
    );
  if (summary.multipleTables) lines.push("The picture has more than one table. Only the first was read.");
  if (addedNote) lines.push("Added the picture's note to Fit tips.");
  return lines;
}
