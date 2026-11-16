// Shrinks a photo in the browser before it's uploaded (owner request 2026-09-30: uploads were slow). A phone photo
// is often 4000px and 5–10 MB; the shop never shows images wider than 1600px (next.config.ts deviceSizes), so a
// 2400px WebP (sharp on high-density screens and zoom) at 0.85 quality is about 10× smaller and looks the same.
// `shrinkForReading` (at the end) is the stricter version for a size chart picture that is only sent to be read.
import {
  SIZE_CHART_PICTURE_MAX_BYTES,
  SIZE_CHART_PICTURE_MAX_SIDE,
  SIZE_CHART_PICTURE_TYPES,
} from "@virzeen/validators/limits";

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

function encode(canvas: HTMLCanvasElement, type: string, quality = QUALITY) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
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

// ── A size chart picture to be read (specs/size-chart-from-picture.md) ──

/** Why a picture can't be sent to be read: not a JPG, PNG or WebP; can't be opened; or still over 900 KB when shrunk. */
export type ReadingPictureResult =
  { ok: true; file: File } | { ok: false; reason: "type" | "unreadable" | "too-big" };

export const isReadablePictureType = (type: string) =>
  (SIZE_CHART_PICTURE_TYPES as readonly string[]).includes(type);

/** Longest side and quality to try, in turn, until the picture is small enough. A table stays legible at 1000px. */
export const READING_ATTEMPTS = [
  [SIZE_CHART_PICTURE_MAX_SIDE, 0.85],
  [SIZE_CHART_PICTURE_MAX_SIDE, 0.7],
  [1200, 0.7],
  [1000, 0.6],
] as const;

/**
 * A size chart picture shrunk to send to a Server Action (which Next.js caps at 1 MB): at most 1600px on the long
 * side and 900 KB, as WebP (JPEG where the browser can't make WebP). Unlike `shrinkForUpload` it never skips a small
 * file, and it keeps trying smaller until the picture fits. The picture stays in the browser and is never uploaded
 * anywhere else. Never throws.
 */
export async function shrinkForReading(file: File): Promise<ReadingPictureResult> {
  if (!isReadablePictureType(file.type)) return { ok: false, reason: "type" };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  try {
    for (const [side, quality] of READING_ATTEMPTS) {
      const { width, height } = targetSize(bitmap.width, bitmap.height, side);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return { ok: false, reason: "unreadable" };
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, width, height);
      let blob = await encode(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") {
        // Safari can't encode WebP; JPEG has no transparency, so see-through parts become white.
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);
        blob = await encode(canvas, "image/jpeg", quality);
      }
      if (blob && blob.size <= SIZE_CHART_PICTURE_MAX_BYTES)
        return { ok: true, file: new File([blob], renamed(file.name, blob.type), { type: blob.type }) };
    }
    return { ok: false, reason: "too-big" };
  } catch {
    return { ok: false, reason: "unreadable" };
  } finally {
    bitmap.close();
  }
}
