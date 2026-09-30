// Which photos to show for a product style (specs/product-styles.md, specs/product-page.md). Pure, shared by the
// gallery, the style tiles, the product details popup and the page's `?style=` link.

type Photo = { color: string | null };
type Variant = { color: string | null; stock: number };

const styleHasStock = (variants: readonly Variant[], style: string) =>
  variants.some((v) => v.color === style && v.stock > 0);

/** The style picked when the page opens: the first one with stock (none when all are sold out). */
export const initialStyle = (variants: readonly Variant[], styles: readonly string[]) =>
  styles.find((style) => styleHasStock(variants, style)) ?? null;

/**
 * The style a `?style=` link asks for (a shared link or a favourite), when the product has it and it's in stock;
 * otherwise the usual first style with stock.
 */
export function styleFromParam(
  param: string | undefined,
  variants: readonly Variant[],
  styles: readonly string[],
) {
  if (param && styles.includes(param) && styleHasStock(variants, param)) return param;
  return initialStyle(variants, styles);
}

/** True when some photo belongs to one of the styles: the picker then shows picture tiles. */
export const hasStylePhotos = (images: readonly Photo[], styles: readonly string[]) =>
  images.some((image) => image.color !== null && styles.includes(image.color));

/**
 * The gallery for a style: only its own photos. A style without photos (or no style picked) shows the photos shared
 * by every style; with none of those either, the first style's that has some. A product without style photos
 * shows all its photos.
 */
export function galleryFor<T extends Photo>(
  images: readonly T[],
  style: string | null,
  styles: readonly string[],
): T[] {
  const own = style ? images.filter((image) => image.color === style) : [];
  if (own.length > 0) return own;
  // A photo of a style that isn't sold any more counts as shared rather than disappearing.
  const shared = images.filter((image) => image.color === null || !styles.includes(image.color));
  if (shared.length > 0) return shared;
  const firstWithPhotos = styles.find((s) => images.some((image) => image.color === s));
  return images.filter((image) => image.color === firstWithPhotos);
}

/** A style tile's picture: the style's first photo, else the product's main photo. */
export function tilePhotoFor<T extends Photo>(images: readonly T[], style: string): T | undefined {
  return images.find((image) => image.color === style) ?? images[0];
}
