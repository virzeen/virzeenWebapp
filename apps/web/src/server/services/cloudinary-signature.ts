import { createHash } from "node:crypto";

/**
 * Cloudinary request signature: parameters sorted by name, joined as `key=value` with `&`, the API secret
 * appended, SHA-1 hex (Cloudinary "Signed upload" docs). `file`, `api_key` and `resource_type` are not signed.
 */
export function cloudinarySignature(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}
