// The size grid's columns, shared by the shop's size picker and the editor's stock grid: every box is as wide as the
// longest size name needs (with the box's own padding), and never more than 5 in a row. "XL" fits 5 in a row,
// "60×60×40" 3. The widths are whole grid classes, so Tailwind sees them.
const COLUMNS = [
  { upTo: 4, className: "grid-cols-[repeat(auto-fill,minmax(max(4.5rem,calc((100%_-_2rem)/5)),1fr))]" },
  { upTo: 6, className: "grid-cols-[repeat(auto-fill,minmax(max(6rem,calc((100%_-_1.5rem)/4)),1fr))]" },
  { upTo: 9, className: "grid-cols-[repeat(auto-fill,minmax(max(8rem,calc((100%_-_1rem)/3)),1fr))]" },
  { upTo: 14, className: "grid-cols-[repeat(auto-fill,minmax(max(10.5rem,calc((100%_-_0.5rem)/2)),1fr))]" },
] as const;

/** The grid-cols class for these sizes: wider boxes (fewer in a row) for longer names, one per row past 14 characters. */
export function sizeGridColumns(sizes: readonly string[]): string {
  const longest = sizes.reduce((most, size) => Math.max(most, [...size.trim()].length), 0);
  return COLUMNS.find((columns) => longest <= columns.upTo)?.className ?? "grid-cols-1";
}
