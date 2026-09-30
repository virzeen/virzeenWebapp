import { cn } from "@virzeen/ui";
import type { FeatureLayout, FeatureRow } from "@virzeen/validators";
import {
  featureSizes,
  featureTiles,
  type FeatureShape,
  type FeatureSpan,
  type FeatureSpot,
  type FeatureTile,
} from "./feature-layout";

// Class names written out in full, so Tailwind finds them.

const MD_SPAN: Record<FeatureSpan, string> = {
  3: "md:col-span-3",
  4: "md:col-span-4",
  6: "md:col-span-6",
  12: "md:col-span-12",
};

const LG_SPAN: Record<FeatureSpan, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
  12: "lg:col-span-12",
};

const COLUMN: Record<NonNullable<FeatureSpot["column"]>, string> = {
  start: "md:col-start-1",
  end: "md:col-start-7",
};

const PHONE_SHAPE: Record<FeatureTile["phone"], string> = {
  portrait: "aspect-4/5",
  landscape: "aspect-16/9",
};

const MD_SHAPE: Record<FeatureShape, string> = {
  portrait: "md:aspect-4/5",
  landscape: "md:aspect-16/9",
  tall: "md:aspect-auto md:flex-1",
};

const LG_SHAPE: Record<FeatureShape, string> = {
  portrait: "lg:aspect-4/5",
  landscape: "lg:aspect-16/9",
  tall: "lg:aspect-auto lg:flex-1",
};

/** A tile's place in the grid from md: its columns (lg too, when they differ), and two rows for a tall one. */
function placeOf({ md, lg }: FeatureTile) {
  return cn(
    MD_SPAN[md.span],
    lg.span !== md.span && LG_SPAN[lg.span],
    md.column && COLUMN[md.column],
    md.shape === "tall" && "md:row-span-2",
  );
}

/** The picture's box at each width: only the changes from the width below. A tall tile is tall at md and lg. */
function shapeOf({ phone, md, lg }: FeatureTile) {
  return cn(
    PHONE_SHAPE[phone],
    md.shape !== phone && MD_SHAPE[md.shape],
    lg.shape !== md.shape && LG_SHAPE[lg.shape],
  );
}

type FeatureFrameProps = { tile: FeatureTile; className?: string; children: React.ReactNode };

/**
 * A feature picture's box, shaped for its tile (4:5, 16:9, or tall from md). The picture (CloudImage
 * `ratio="none"`, `absolute inset-0`) and anything on it go inside. From md a tall one fills its tile's height but
 * never gets shorter than the two 16:9 pictures stacked beside it (an 8:9 spacer), so its own title and text can't
 * squeeze it into a strip; when they are long, the rows grow instead.
 */
export function FeatureFrame({ tile, className, children }: FeatureFrameProps) {
  return (
    <div className={cn("relative", shapeOf(tile), className)}>
      {tile.md.shape === "tall" && <span aria-hidden className="hidden md:block md:aspect-8/9" />}
      {children}
    </div>
  );
}

/** What a tile is told: its place and shapes, and the image `sizes` for its widths. */
export type FeatureTileView = FeatureTile & { sizes: string };

type FeatureGridProps<T> = Omit<React.ComponentProps<"ul">, "children"> & {
  layout: FeatureLayout;
  /** The Custom layout's rows (the other layouts ignore them). */
  rows?: readonly FeatureRow[] | undefined;
  items: readonly T[];
  itemKey: (item: T) => string;
  /** One feature's tile (picture first). Its root should grow (`flex-1`) so a tall picture can fill the height. */
  renderItem: (item: T, tile: FeatureTileView) => React.ReactNode;
  /** Every feature is only a picture: rows sit as close together as columns. */
  tight?: boolean;
};

/**
 * "Features that perform" laid out in the product's layout (specs/product-page-v2.md, feature-layout.ts): one
 * feature per row on phones, a 12-column grid from md. Used by the shop and the admin Preview. No hooks, so a Server
 * Component can render it with its own `renderItem`.
 */
export function FeatureGrid<T>({
  layout,
  rows,
  items,
  itemKey,
  renderItem,
  tight = false,
  className,
  ...props
}: FeatureGridProps<T>) {
  const tiles = featureTiles(layout, items.length, rows);
  // A tile pinned to the second half ("Two + tall") goes back up beside the ones before it.
  const dense = tiles.some((tile) => tile.md.column === "end");
  return (
    <ul
      className={cn(
        "grid gap-x-4 md:grid-cols-12",
        tight ? "gap-y-4" : "gap-y-8",
        dense && "md:grid-flow-row-dense",
        className,
      )}
      {...props}
    >
      {items.map((item, index) => {
        const tile = tiles[index];
        if (!tile) return null;
        return (
          <li key={itemKey(item)} className={cn("flex flex-col", placeOf(tile))}>
            {renderItem(item, { ...tile, sizes: featureSizes(tile) })}
          </li>
        );
      })}
    </ul>
  );
}
