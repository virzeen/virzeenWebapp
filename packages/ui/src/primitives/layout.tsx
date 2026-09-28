import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const containerVariants = cva("mx-auto w-full px-4 sm:px-6 lg:px-8", {
  variants: {
    width: {
      default: "max-w-7xl",
      narrow: "max-w-3xl",
      full: "max-w-none",
    },
  },
  defaultVariants: { width: "default" },
});

export type ContainerProps = React.ComponentProps<"div"> &
  VariantProps<typeof containerVariants> & { as?: "div" | "section" | "main" | "header" | "footer" };

/** Page-width wrapper with the standard gutters (px-4 → px-6 → px-8, max 1280px). `narrow` for reading pages. */
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
  products: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  two: "grid-cols-1 md:grid-cols-2",
  three: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
} as const;

export type GridProps = React.ComponentProps<"div"> & {
  /** `products`: 2 / 3 / 4 columns (docs/ui/design-tokens.md §6). */
  columns?: keyof typeof gridColumns;
  gap?: Gap;
};

/** Responsive grid for cards and sections. */
export function Grid({ className, columns = "products", gap = 4, ...props }: GridProps) {
  return <div className={cn("grid", gridColumns[columns], gapVariants[gap], className)} {...props} />;
}
