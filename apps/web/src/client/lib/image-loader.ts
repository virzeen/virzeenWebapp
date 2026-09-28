"use client";

// Global next/image loader (next.config.ts images.loaderFile). Cloudinary public ids get automatic format and
// quality at a fixed set of widths; local /public paths (seed data, brand assets) are served as-is.

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width }: LoaderArgs): string {
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("https://")) {
    return src.startsWith("/") ? `${src}?w=${width}` : src;
  }
  if (!cloudName) return `/placeholder/missing.svg?w=${width}`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/${src}`;
}
