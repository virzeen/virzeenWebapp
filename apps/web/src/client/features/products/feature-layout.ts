import type { FeatureLayout, FeatureRow } from "@virzeen/validators";

// "Features that perform" layouts (specs/product-page-v2.md): the place and shape of each feature's picture on
// phones, from md and from lg. Pure, so the shop and the admin Preview lay the features out the same way
// (feature-grid.tsx draws it).

/**
 * A feature picture's shape at one width.
 * - portrait: 4:5.
 * - landscape: 16:9.
 * - tall: from md only, two rows high, as tall as the two landscape pictures stacked beside it.
 */
export type FeatureShape = "portrait" | "landscape" | "tall";

/** How many of the grid's 12 columns a tile takes from md: a quarter, a third, a half or the whole row. */
export type FeatureSpan = 3 | 4 | 6 | 12;

/**
 * A tile's place from md (a 12-column grid). Tiles fill each row in list order; `column` pins a tile to the row's
 * first column ("start") or its second half ("end"), which "Two + tall" needs to put its tall picture on the right.
 */
export type FeatureSpot = { span: FeatureSpan; shape: FeatureShape; column?: "start" | "end" };

/**
 * One feature's tile. On phones every feature has a row of its own (full width), 16:9 when it is a landscape
 * picture, else 4:5. `md` is 768px and up, `lg` 1024px and up. A tall tile is tall at md and lg alike.
 */
export type FeatureTile = { phone: "portrait" | "landscape"; md: FeatureSpot; lg: FeatureSpot };

/** How many columns each picture of a row of 1 to 4 takes. */
const SPANS = { 1: 12, 2: 6, 3: 4, 4: 3 } as const satisfies Record<number, FeatureSpan>;

const spot = (span: FeatureSpan, shape: FeatureShape, column?: "start" | "end"): FeatureSpot =>
  column ? { span, shape, column } : { span, shape };

/** The same place from md up; on phones, the picture keeps its shape (a tall one is 4:5). */
const tile = (at: FeatureSpot): FeatureTile => ({
  phone: at.shape === "landscape" ? "landscape" : "portrait",
  md: at,
  lg: at,
});

/** `count` pictures sharing one row (1 to 4), all of one shape. */
const row = (count: 1 | 2 | 3 | 4, shape: "portrait" | "landscape") =>
  Array.from({ length: count }, () => tile(spot(SPANS[count], shape)));

const WHOLE = tile(spot(12, "landscape"));
const repeat = <T>(length: number, make: (index: number) => T) => Array.from({ length }, (_, i) => make(i));

/**
 * "Three across": three 4:5 pictures a row from lg, never one alone on a row (7 → 3, 2, 2; 8 → 3, 3, 2; 4 → 2, 2),
 * two a row at md, where a lone last one takes the whole row (16:9). One feature alone is full width, 16:9.
 */
function threeAcross(count: number): FeatureTile[] {
  if (count === 1) return [WHOLE];
  const pairs = count % 3 === 1 ? 2 : count % 3 === 2 ? 1 : 0;
  const threes = (count - 2 * pairs) / 3;
  const lg = [
    ...repeat(3 * threes, () => spot(4, "portrait")),
    ...repeat(2 * pairs, () => spot(6, "portrait")),
  ];
  return lg.map((at, index): FeatureTile => ({
    phone: "portrait",
    md: count % 2 === 1 && index === count - 1 ? spot(12, "landscape") : spot(6, "portrait"),
    lg: at,
  }));
}

/** "Three + two": groups of five, three 4:5 then two 16:9; 3 or 4 left over start three across, then as below. */
function threeTwo(count: number): FeatureTile[] {
  const group = [...row(3, "portrait"), ...row(2, "landscape")];
  const groups = Math.floor(count / 5);
  let rest = count % 5;
  const tiles = repeat(groups * 5, (index) => group[index % 5] as FeatureTile);
  if (rest >= 3) {
    tiles.push(...row(3, "portrait"));
    rest -= 3;
  }
  // 2 left: two 16:9 side by side; 1 left: full width, 16:9.
  if (rest === 2) tiles.push(...row(2, "landscape"));
  if (rest === 1) tiles.push(WHOLE);
  return tiles;
}

/** "Two across": two 4:5 pictures a row; a lone last one takes the whole row (16:9). */
function twoAcross(count: number): FeatureTile[] {
  return repeat(count, (index) =>
    count % 2 === 1 && index === count - 1 ? WHOLE : tile(spot(6, "portrait")),
  );
}

/** The layouts that go in groups of three, each group's tiles in list order. */
const GROUPS: Record<"TALL_LEFT" | "TALL_RIGHT" | "WIDE_TOP", readonly FeatureTile[]> = {
  // A tall picture on the left, as high as the two 16:9 ones stacked on the right.
  TALL_LEFT: [tile(spot(6, "tall", "start")), tile(spot(6, "landscape")), tile(spot(6, "landscape"))],
  // The same, mirrored: the two stacked ones first (left), then the tall one (right).
  TALL_RIGHT: [
    tile(spot(6, "landscape", "start")),
    tile(spot(6, "landscape", "start")),
    tile(spot(6, "tall", "end")),
  ],
  // One full width (16:9), then two side by side (4:5).
  WIDE_TOP: [WHOLE, ...row(2, "portrait")],
};

/** Groups of three; one left over is full width (16:9), two left over sit side by side (4:5). */
function groupsOfThree(group: readonly FeatureTile[], count: number): FeatureTile[] {
  const grouped = count - (count % 3);
  const rest = count - grouped;
  return [
    ...repeat(grouped, (index) => group[index % 3] as FeatureTile),
    ...(rest === 1 ? [WHOLE] : rest === 2 ? row(2, "portrait") : []),
  ];
}

/** A stored row's picture count as 1 to 4, whatever it holds. */
const rowCount = (count: number): 1 | 2 | 3 | 4 =>
  Math.min(4, Math.max(1, Math.floor(Number.isFinite(count) ? count : 1))) as 1 | 2 | 3 | 4;

/**
 * "Custom": the owner's rows, top to bottom, filled in list order. More pictures than the rows hold repeat the last
 * row; a row with fewer pictures left than it holds shares its width among them. A row showing 4 is 2 + 2 at md.
 * No rows: "Three across".
 */
function customRows(rows: readonly FeatureRow[], count: number): FeatureTile[] {
  if (rows.length === 0) return threeAcross(count);
  const tiles: FeatureTile[] = [];
  for (let index = 0; tiles.length < count; index++) {
    const { count: holds, shape } = rows[Math.min(index, rows.length - 1)] as FeatureRow;
    const shown = rowCount(Math.min(rowCount(holds), count - tiles.length));
    const picture = shape === "LANDSCAPE" ? "landscape" : "portrait";
    const lg = spot(SPANS[shown], picture);
    const md = shown === 4 ? spot(6, picture) : lg;
    tiles.push(...repeat(shown, (): FeatureTile => ({ phone: picture, md, lg })));
  }
  return tiles;
}

/**
 * Each feature's tile, in list order, for `count` features in `layout` (specs/product-page-v2.md). `rows` are the
 * Custom layout's rows (ignored by the other layouts). Every row from md is filled: its spans add up to 12, and a
 * tall picture fills its half of two rows.
 */
export function featureTiles(
  layout: FeatureLayout,
  count: number,
  rows: readonly FeatureRow[] = [],
): FeatureTile[] {
  const length = Math.max(0, Math.floor(count));
  if (length === 0) return [];
  switch (layout) {
    case "THREE":
      return threeAcross(length);
    case "THREE_TWO":
      return threeTwo(length);
    case "TWO":
      return twoAcross(length);
    case "FULL":
      return repeat(length, () => WHOLE);
    case "TALL_LEFT":
    case "TALL_RIGHT":
    case "WIDE_TOP":
      return groupsOfThree(GROUPS[layout], length);
    case "CUSTOM":
      return customRows(rows, length);
    default:
      return threeAcross(length);
  }
}

/** The image `sizes` for a tile: the widest it is shown at each width (the page is at most 1280px wide). */
export function featureSizes({ md, lg }: FeatureTile): string {
  const share = (span: FeatureSpan) => `${Math.round((span / 12) * 100)}vw`;
  return [
    `(min-width: 1280px) ${Math.round((1280 * lg.span) / 12)}px`,
    `(min-width: 1024px) ${share(lg.span)}`,
    `(min-width: 768px) ${share(md.span)}`,
    "100vw",
  ].join(", ");
}
