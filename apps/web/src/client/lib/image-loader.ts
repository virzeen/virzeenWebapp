"use client";

// Global next/image loader (next.config.ts images.loaderFile). Cloudinary public ids get automatic format and
// quality at a fixed set of widths; local /public paths (seed data, brand assets) are served as-is, except the
// large brand photos below, which have WebP width variants.

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Written by scripts/brand-image-variants.mjs (re-run it after replacing a photo).
const LOCAL_VARIANTS: Record<string, readonly number[]> = {
  "/brand/hero.jpg": [400, 800, 1200, 1600],
};

type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width }: LoaderArgs): string {
  const variants = LOCAL_VARIANTS[src];
  if (variants) {
    const best = variants.find((w) => w >= width) ?? variants[variants.length - 1];
    return src.replace(/\.jpg$/, `-${best}.webp`);
  }
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("https://")) {
    return src.startsWith("/") ? `${src}?w=${width}` : src;
  }
  if (!cloudName) return `/placeholder/missing.svg?w=${width}`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/${src}`;
}
