/** Which ends of a sideways row are reached. Both at once means every card fits. */
export type RowEdges = { start: boolean; end: boolean };

/** Scroll positions can be fractional on zoomed or high-density screens: 1px counts as there. */
const SLACK = 1;

/** Where a scrolling row stands, from its scroll position and sizes. */
export function rowEdges(row: { scrollLeft: number; clientWidth: number; scrollWidth: number }): RowEdges {
  return {
    start: row.scrollLeft <= SLACK,
    end: row.scrollLeft + row.clientWidth >= row.scrollWidth - SLACK,
  };
}
