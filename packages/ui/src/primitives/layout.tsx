import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const containerVariants = cva("mx-auto w-full px-gutter", {
  variants: {
    width: {
      default: "max-w-page",
      narrow: "max-w-3xl",
      full: "max-w-none",
    },
  },
  defaultVariants: { width: "default" },
});

export type ContainerProps = React.ComponentProps<"div"> &
  VariantProps<typeof containerVariants> & { as?: "div" | "section" | "main" | "header" | "footer" };

/**
 * Page-width wrapper, the same width as nike.com's pages (owner 2026-11-10): a 24px side margin (`gutter`), 48px from
 * 960px wide, and content at most 1824px wide, centred (`max-w-page`, 1920px with the margins). `narrow` for reading
 * pages (768px), `full` for edge-to-edge sections that keep the margins.
 */
export function Container({ className, width, as: Tag = "div", ...props }: ContainerProps) {
  return <Tag className={cn(containerVariants({ width }), className)} {...props} />;
}

const gapVariants = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
  16: "gap-16",
} as const;

export type Gap = keyof typeof gapVariants;

export type StackProps = React.ComponentProps<"div"> & {
  gap?: Gap;
  direction?: "column" | "row";
  align?: "start" | "center" | "end" | "stretch";
};

/** Stacks children vertically (default) or horizontally with a gap from the spacing scale. */
export function Stack({ className, gap = 4, direction = "column", align = "stretch", ...props }: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "column" ? "flex-col" : "flex-row flex-wrap",
        { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }[align],
        gapVariants[gap],
        className,
      )}
      {...props}
    />
  );
}

const gridColumns = {
  /**
   * Every grid of product cards, as nike.com's shop (owner 2026-11-08, measured again 2026-11-10): 2 a row below
   * 960px, running to the screen's edges with 6px between photos (cards put their text `px-card-inset` in); 3 a row
   * from 960px, inside the page's gutter, 16px apart. The gaps are part of the variant, so `gap` is ignored.
   */
  products: "mx-grid-bleed grid-cols-products gap-x-product-gap gap-y-10 md:gap-y-12",
  two: "grid-cols-1 md:grid-cols-2",
  three: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
} as const;

export type GridProps = React.ComponentProps<"div"> & {
  /** `products`: product cards, Nike's grid (docs/ui/design-tokens.md §6). */
  columns?: keyof typeof gridColumns;
  gap?: Gap;
};

/** Responsive grid for cards and sections. */
export function Grid({ className, columns = "products", gap = 4, ...props }: GridProps) {
  // The columns come after the gap, so `products`' row gap wins over `gap`'s.
  return <div className={cn("grid", gapVariants[gap], gridColumns[columns], className)} {...props} />;
}
