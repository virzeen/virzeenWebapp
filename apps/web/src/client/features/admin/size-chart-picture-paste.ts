import { isReadablePictureType } from "@/client/lib/shrink-image";

/**
 * The picture on the clipboard (a screenshot, or "Copy image" from a page or a file), or null. Anything with text on
 * it is left alone: cells copied from Excel or Google Sheets come with a picture of them as well, and must still go
 * to the size table's own paste.
 */
export function pastedPicture(clipboard: { types: readonly string[]; files: ArrayLike<File> }): File | null {
  if (clipboard.types.includes("text/plain")) return null;
  return Array.from(clipboard.files).find((file) => isReadablePictureType(file.type)) ?? null;
}
