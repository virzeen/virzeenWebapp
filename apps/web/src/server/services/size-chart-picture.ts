import "server-only";
import { AppError } from "@virzeen/core";
import {
  SIZE_CHART_PICTURE_SERVER_MAX_BYTES,
  type SIZE_CHART_PICTURE_TYPES,
} from "@virzeen/validators/limits";

// The picture sent to be read (specs/size-chart-from-picture.md): checked from the file's own bytes, never from what
// the browser called it, before anything leaves our server.

export type ChartPictureType = (typeof SIZE_CHART_PICTURE_TYPES)[number];
export type ChartPicture = { bytes: Uint8Array; mimeType: ChartPictureType };

export const PICTURE_MESSAGES = {
  wrongType: "Choose a JPG, PNG or WebP picture.",
  tooBig: "That picture is too big. Try a smaller one.",
} as const;

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/** JPEG, PNG or WebP by the file's first bytes; null for anything else (a renamed PDF or program, a GIF…). */
export function sniffPictureType(bytes: Uint8Array): ChartPictureType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF", four bytes of length, "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

/** The form's `picture` entry as a picture to read, or VALIDATION_FAILED with wording the admin sees. */
export async function checkChartPicture(entry: FormDataEntryValue | null): Promise<ChartPicture> {
  if (!(entry instanceof File) || entry.size === 0)
    throw new AppError("VALIDATION_FAILED", PICTURE_MESSAGES.wrongType);
  if (entry.size > SIZE_CHART_PICTURE_SERVER_MAX_BYTES)
    throw new AppError("VALIDATION_FAILED", PICTURE_MESSAGES.tooBig);
  const bytes = new Uint8Array(await entry.arrayBuffer());
  const mimeType = sniffPictureType(bytes);
  if (!mimeType) throw new AppError("VALIDATION_FAILED", PICTURE_MESSAGES.wrongType);
  return { bytes, mimeType };
}
