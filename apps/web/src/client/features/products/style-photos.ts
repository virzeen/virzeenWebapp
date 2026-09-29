// Which photos to show for a product style (specs/product-styles.md). Pure, shared by the gallery and the picker.

type Photo = { color: string | null };
type Variant = { color: string | null; stock: number };

/** The style picked when the page opens: the first one with stock (none when all are sold out). */
export const initialStyle = (variants: readonly Variant[], styles: readonly string[]) =>
  styles.find((style) => variants.some((v) => v.color === style && v.stock > 0)) ?? null;

/** True when some photo belongs to one of the styles: the picker then shows picture swatches. */
export const hasStylePhotos = (images: readonly Photo[], styles: readonly string[]) =>
  images.some((image) => image.color !== null && styles.includes(image.color));

/**
 * The gallery for a style: its own photos, then the ones shared by every style. With no style picked, or a style
 * without photos, the shared photos; with none of those either, the first style's photos.
 */
export function galleryFor<T extends Photo>(
  images: readonly T[],
  style: string | null,
  styles: readonly string[],
) {
  const shared = images.filter((image) => image.color === null || !styles.includes(image.color));
  const own = style ? images.filter((image) => image.color === style) : [];
  if (own.length > 0) return [...own, ...shared];
  if (shared.length > 0) return shared;
  return images.filter((image) => image.color === styles[0]);
}
