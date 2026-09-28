import "server-only";
import { createHash } from "node:crypto";
import { AppError } from "@virzeen/core";
import { env, features } from "@/server/env";

// Signed direct uploads (project-brief.md §10 Cloudinary): the browser uploads straight to Cloudinary with
// parameters our server signed; the API secret never leaves the server.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif";

export type UploadSignature = {
  uploadUrl: string;
  fields: Record<string, string>;
  maxBytes: number;
};

export function signUpload(folder: "products" | "portfolio", entityId: string): UploadSignature {
  if (!features.cloudinary)
    throw new AppError("CONFLICT", "Image uploads aren't set up yet (Cloudinary keys missing).");
  const params: Record<string, string> = {
    allowed_formats: ALLOWED_FORMATS,
    folder: `virzeen/${folder}/${entityId}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + env.CLOUDINARY_API_SECRET)
    .digest("hex");
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    fields: { ...params, api_key: env.CLOUDINARY_API_KEY as string, signature },
    maxBytes: MAX_UPLOAD_BYTES,
  };
}
