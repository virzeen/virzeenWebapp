// Shrinks a photo in the browser before it's uploaded (owner request 2026-09-30: uploads were slow). A phone photo
// is often 4000px and 5–10 MB; the shop never shows images wider than 1600px (next.config.ts deviceSizes), so a
// 2400px WebP (sharp on high-density screens and zoom) at 0.85 quality is about 10× smaller and looks the same.

/** Longest side kept, in pixels. */
export const MAX_SIDE = 2400;
const QUALITY = 0.85;
/** Smaller files go up as they are: shrinking wouldn't save enough to be worth the time. */
const SMALL_ENOUGH = 700 * 1024;

/** The size to draw at: the longest side capped at `max`, the shape kept. */
export function targetSize(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The new file name: same name, the new format's extension. */
export function renamed(name: string, type: string) {
  const extension = type === "image/webp" ? "webp" : "jpg";
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.${extension}`;
}

function encode(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * The photo, smaller, as WebP (JPEG where the browser can't make WebP, e.g. Safari). Returns the original when it's
 * already small, isn't a photo the browser can read (e.g. HEIC outside Safari), or wouldn't get smaller. Never
 * throws: a photo that can't be shrunk is uploaded as it is.
 */
export async function shrinkForUpload(file: File): Promise<File> {
  if (file.size <= SMALL_ENOUGH || !/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return file;
  try {
    // "from-image" turns photos taken sideways upright, as the phone showed them.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = targetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    // Safari can't encode WebP and quietly returns PNG, so check what came back.
    let blob = await encode(canvas, "image/webp");
    if (!blob || blob.type !== "image/webp") {
      // JPEG has no transparency: see-through parts of a PNG become white (the page colour), not black.
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "white";
      context.fillRect(0, 0, width, height);
      blob = await encode(canvas, "image/jpeg");
    }
    bitmap.close();
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], renamed(file.name, blob.type), {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
