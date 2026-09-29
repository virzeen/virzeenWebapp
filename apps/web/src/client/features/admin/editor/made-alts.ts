// Photo descriptions the save made (catalogService.saveProduct: "{name}", "{name}, {style}", then ", photo {n}"
// from each group's second photo on) name the product, the style and the photo's place. getProductForEdit returns
// them as if typed, so after a rename or a move the editor clears them ("") and the next save makes them again
// (the made photo descriptions of specs/admin-product-editor.md). Pure.

type Photo = { alt?: string | undefined; color?: string | undefined };

/** A form change for commitFields or setValue: a photo's description back to blank. */
export type AltReset = { name: `images.${number}.alt`; value: "" };

const PHOTO = ", photo ";

/** True when `alt` is the description the save makes for a photo of `style` ("" = shared) of the product `name`. */
export function isMadePhotoAlt(alt: string | undefined, name: string, style: string): boolean {
  const text = (alt ?? "").trim();
  const base = style.trim() ? `${name.trim()}, ${style.trim()}` : name.trim();
  if (text === "" || base === "") return false;
  if (text === base) return true;
  return text.startsWith(`${base}${PHOTO}`) && /^\d+$/.test(text.slice(base.length + PHOTO.length));
}

/**
 * The resets for the photos whose description was made the way `madeWith` says: it gets each photo's style and
 * returns the product name and style its made description would have used, or null to leave the photo alone.
 */
export function photoAltResets(
  images: readonly Photo[],
  madeWith: (style: string) => { name: string; style: string } | null,
): AltReset[] {
  return images.flatMap((image, index) => {
    const made = madeWith((image.color ?? "").trim());
    return made && isMadePhotoAlt(image.alt, made.name, made.style)
      ? [{ name: `images.${index}.alt` as const, value: "" as const }]
      : [];
  });
}
