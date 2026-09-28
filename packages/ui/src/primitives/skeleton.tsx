import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const skeletonVariants = cva("bg-surface motion-safe:animate-shimmer", {
  variants: {
    shape: {
      block: "rounded-sm",
      text: "h-4 rounded-sm",
      circle: "rounded-full",
      image: "aspect-4/5 w-full rounded-sm",
    },
  },
  defaultVariants: { shape: "block" },
});

export type SkeletonProps = React.ComponentProps<"div"> & VariantProps<typeof skeletonVariants>;

/**
 * Loading placeholder that matches the final layout (no full-page spinners).
 * Size it with width/height classes; `shape="image"` is the 4:5 product image ratio.
 */
export function Skeleton({ className, shape, ...props }: SkeletonProps) {
  return <div aria-hidden className={cn(skeletonVariants({ shape }), className)} {...props} />;
}
