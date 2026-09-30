// Which photos the editor's gallery shows for the picked style, where a move goes in the whole list, and where an
// upload lands when it finishes after the styles changed (specs/product-editor-on-page.md "Gallery"). Pure.

/** Per style (and for the photos of a product without styles), as in the form editor. */
export const PHOTOS_PER_STYLE = 12;
/** productSchema: "Add up to 60 photos". */
export const PHOTOS_PER_PRODUCT = 60;

type Photo = { url: string; alt?: string | undefined; color?: string | undefined };

/** A photo on show with its place in the whole `images` list (the form's index). */
export type ShownPhoto = { index: number; url: string; alt: string };

const colorOf = (photo: Photo) => (photo.color ?? "").trim();

/**
 * The gallery for a style, like the shop's galleryFor: its own photos; a style without its own shows the photos
 * shared by every style (`shared` is then true); a product without styles shows every photo. Unlike the shop, a
 * style with no photos at all shows none (the drop zone), never another style's.
 */
export function galleryPhotos(
  images: readonly Photo[],
  style: string,
  styles: readonly string[],
): { photos: ShownPhoto[]; shared: boolean } {
  const all = images.map((image, index) => ({
    index,
    url: image.url,
    alt: image.alt ?? "",
    color: colorOf(image),
  }));
  const strip = (list: typeof all) => list.map(({ index, url, alt }) => ({ index, url, alt }));
  if (styles.length === 0) return { photos: strip(all), shared: false };
  const own = all.filter((photo) => photo.color === style);
  if (own.length > 0) return { photos: strip(own), shared: false };
  // A photo of a style that isn't sold any more counts as shared, as in the shop.
  const shared = all.filter((photo) => photo.color === "" || !styles.includes(photo.color));
  return { photos: strip(shared), shared: shared.length > 0 };
}

/** How many more photos the style (or the product without styles) takes. */
export function uploadRoom(images: readonly Photo[], style: string, styles: readonly string[]) {
  const own = styles.length === 0 ? images.length : images.filter((image) => colorOf(image) === style).length;
  return Math.max(0, Math.min(PHOTOS_PER_STYLE - own, PHOTOS_PER_PRODUCT - images.length));
}

/**
 * The whole-list move for the photo shown at `from` to the place of the one shown at `to` (react-hook-form's
 * move(from, to)); null when either isn't there. Photos of other styles in between keep their places.
 */
export function photoMove(photos: readonly ShownPhoto[], from: number, to: number): [number, number] | null {
  const source = photos[from];
  const target = photos[to];
  return source && target && from !== to ? [source.index, target.index] : null;
}

/**
 * A rename between two renders of the style list (useVariantOptions renames in place): the one name that changed
 * and is gone; null for an add, a removal or no change.
 */
export function renamedStyle(before: readonly string[], after: readonly string[]) {
  if (before.length !== after.length) return null;
  const changed = before.flatMap((name, i) => (name !== after[i] ? [i] : []));
  const [at] = changed;
  if (changed.length !== 1 || at === undefined) return null;
  const from = before[at];
  const to = after[at];
  return from === undefined || to === undefined || after.includes(from) ? null : { from, to };
}

/**
 * Where a finished upload goes: the style it was started for, following renames made meanwhile (`renames`: old name
 * to new). "" (shared) when it was started without styles or the product has none now. null when its style was
 * removed: its photos went with it, so this one goes too.
 */
export function landingStyle(
  style: string,
  renames: ReadonlyMap<string, string>,
  styles: readonly string[],
): string | null {
  if (style === "" || styles.length === 0) return "";
  let name = style;
  const seen = new Set<string>();
  while (!styles.includes(name) && !seen.has(name)) {
    seen.add(name);
    const next = renames.get(name);
    if (next === undefined) break;
    name = next;
  }
  return styles.includes(name) ? name : null;
}
