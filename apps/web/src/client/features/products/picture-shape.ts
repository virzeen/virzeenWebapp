// The box for a picture shown whole at the width it's given (an Accessories size chart in the Size guide popup,
// specs/product-page-v2.md "Size guides"): the closest of a few shapes to the picture's own, so it fills the width
// with little empty space around it. Class names are written out in full so Tailwind builds them.

const SHAPES = [
  { ratio: 2, className: "aspect-2/1" },
  { ratio: 16 / 9, className: "aspect-16/9" },
  { ratio: 3 / 2, className: "aspect-3/2" },
  { ratio: 4 / 3, className: "aspect-4/3" },
  { ratio: 1, className: "aspect-square" },
  { ratio: 4 / 5, className: "aspect-4/5" },
  { ratio: 3 / 4, className: "aspect-3/4" },
  { ratio: 2 / 3, className: "aspect-2/3" },
  { ratio: 9 / 16, className: "aspect-9/16" },
] as const;

/** Before the picture has loaded (its shape isn't known yet). */
export const UNKNOWN_SHAPE = "aspect-square";

/** The shape class closest to a `width` by `height` picture (compared as ratios, so 2:1 and 1:2 are as far off). */
export function closestShape(width: number, height: number): string {
  if (!(width > 0 && height > 0)) return UNKNOWN_SHAPE;
  const target = Math.log(width / height);
  const off = (ratio: number) => Math.abs(Math.log(ratio) - target);
  return SHAPES.reduce((best, shape) => (off(shape.ratio) < off(best.ratio) ? shape : best)).className;
}
