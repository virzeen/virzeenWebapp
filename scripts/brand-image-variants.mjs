// Writes WebP width variants of the large brand photos in apps/web/public/brand, so phones don't download the
// full 2400px JPEG (the image loader maps `/brand/<name>.jpg` to `/brand/<name>-<width>.webp`).
// Run after replacing a photo: `node scripts/brand-image-variants.mjs`, then commit the .webp files.
// Widths match next.config.ts images.deviceSizes; the list of photos matches LOCAL_VARIANTS in image-loader.ts.

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// sharp ships with Next (an optional dependency), so resolve it the way Next does.
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = createRequire(webRequire.resolve("next/package.json"))("sharp");

const BRAND = fileURLToPath(new URL("../apps/web/public/brand/", import.meta.url));
const PHOTOS = ["hero"];
const WIDTHS = [400, 800, 1200, 1600];

for (const name of PHOTOS) {
  for (const width of WIDTHS) {
    const out = `${BRAND}${name}-${width}.webp`;
    const info = await sharp(`${BRAND}${name}.jpg`)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toFile(out);
    console.log(`${name}-${width}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
  }
}
