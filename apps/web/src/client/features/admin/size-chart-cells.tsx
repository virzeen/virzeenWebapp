// Shared pieces of the size table grid's cells (SizeChartGrid, SizeChartRow).

/** A grid cell: padding, a line under each row (none under the last), inputs at the top. */
export const gridCellClass = "border-b border-line p-2 align-top group-last:border-b-0";

/** The Size column: pinned while the grid scrolls sideways, tinted with its row. */
export const gridStickyClass =
  "sticky left-0 border-r border-b border-line bg-canvas p-2 align-top group-last:border-b-0 group-focus-within:bg-surface";

/** A header cell (the measurement names): on the surface colour, with a line under the row. */
export const gridHeaderClass = "border-b border-line bg-surface p-2 text-left align-top font-normal";

/** The Size column's header cell, pinned like the column. */
export const gridHeaderStickyClass =
  "sticky left-0 border-r border-b border-line bg-surface p-2 text-left align-top font-normal";

/** What a box in the grid gets from the grid: its place (for Enter and focus), and the spreadsheet paste. */
export type GridBoxProps = {
  "data-cell": string;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
};

export type GridBoxHandlers = {
  /** Props for the box at `row` (-1 = the measurement names) and `col` (0 = the Size column). */
  box: (row: number, col: number) => GridBoxProps;
};

/** A box's problem, linked to it for screen readers (aria-describedby), with the line to show under it. */
export function cellError(id: string, message: string | undefined) {
  return {
    props: {
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? id : undefined,
    },
    line: message ? (
      <p id={id} className="pt-1 text-small text-danger">
        {message}
      </p>
    ) : null,
  };
}
