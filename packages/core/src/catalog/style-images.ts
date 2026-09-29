/**
 * The photo that shows a variant (bag lines, order snapshots): its style's first photo, else the first photo shared
 * by every style, else the first photo (specs/product-styles.md). `images` are in sortOrder.
 */
export function imageForColor<T extends { color: string | null }>(
  images: readonly T[],
  color: string | null,
): T | undefined {
  return (
    (color ? images.find((image) => image.color === color) : undefined) ??
    images.find((image) => !image.color) ??
    images[0]
  );
}
