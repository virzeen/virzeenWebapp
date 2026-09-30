// Makes every icon from the owner's logo files (apps/web/public/brand/logo, 2026-09-30):
// - apps/web/src/app/icon.svg: the browser tab. The mark alone, black when the browser is light and white when it's
//   dark (SVG favicons follow prefers-color-scheme).
// - apps/web/src/app/apple-icon.png and apps/web/public/icons/*.png: home-screen icons, which can't follow the
//   theme, so a white mark on an ink tile (maskable: mark inside the safe zone).
// - apps/web/src/app/opengraph-image.png: link previews, the white wordmark on ink.
// Run after replacing a logo file: `node scripts/brand-icons.mjs`, then commit the results.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// sharp ships with Next (an optional dependency), so resolve it the way Next does.
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = createRequire(webRequire.resolve("next/package.json"))("sharp");

const web = fileURLToPath(new URL("../apps/web/", import.meta.url));
const INK = "#141414"; // packages/ui/src/tokens/tokens.ts colors.ink
const CANVAS = "#ffffff"; // colors.canvas

/** The shapes of an SVG file (paths, rects, polygons) without their colours, and its viewBox. */
function shapesOf(file) {
  const svg = readFileSync(`${web}public/brand/logo/${file}`, "utf8");
  const [x, y, width, height] = svg
    .match(/viewBox="([^"]+)"/)[1]
    .split(/[\s,]+/)
    .map(Number);
  const shapes = [...svg.matchAll(/<(path|rect|polygon)\b([^>]*?)\/>/g)]
    .map(([, tag, attrs]) => `<${tag} ${attrs.replace(/\s*(class|id|data-name)="[^"]*"/g, "").trim()}/>`)
    .join("");
  return { x, y, width, height, shapes };
}

const mark = shapesOf("logo-black.svg");
const typo = shapesOf("typo-white.svg");

/** The shapes centred in a square (or w×h) box, the art taking `share` of the box's width or height. */
function centred(art, { width, height, share, fill, background }) {
  const scale = Math.min((width * share) / art.width, (height * share) / art.height);
  const dx = (width - art.width * scale) / 2 - art.x * scale;
  const dy = (height - art.height * scale) / 2 - art.y * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${
    background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : ""
  }<g fill="${fill}" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${scale.toFixed(5)})">${art.shapes}</g></svg>`;
}

async function png(svg, out) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`${web}${out}`);
  console.log(`Wrote ${out}`);
}

// Browser tab: square box, a little padding; the fill switches with the browser's theme.
const pad = mark.width * 0.04;
const side = mark.width + 2 * pad;
const box = [-pad, -(side - mark.height) / 2, side, side].map((n) => n.toFixed(2)).join(" ");
const tab = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">
  <style>g{fill:${INK}}@media (prefers-color-scheme:dark){g{fill:${CANVAS}}}</style>
  <g>${mark.shapes}</g>
</svg>
`;
writeFileSync(`${web}src/app/icon.svg`, tab);
console.log("Wrote src/app/icon.svg");

// Home screens: white mark on an ink tile. iOS and Android round the corners themselves.
await png(
  centred(mark, { width: 180, height: 180, share: 0.56, fill: CANVAS, background: INK }),
  "src/app/apple-icon.png",
);
await png(
  centred(mark, { width: 192, height: 192, share: 0.56, fill: CANVAS, background: INK }),
  "public/icons/icon-192.png",
);
await png(
  centred(mark, { width: 512, height: 512, share: 0.56, fill: CANVAS, background: INK }),
  "public/icons/icon-512.png",
);
// Maskable: launchers may cut the icon to a circle of 80% of its size, so the mark stays well inside it.
await png(
  centred(mark, { width: 512, height: 512, share: 0.42, fill: CANVAS, background: INK }),
  "public/icons/maskable-512.png",
);

// Link previews (1200×630): the white wordmark on ink.
await png(
  centred(typo, { width: 1200, height: 630, share: 0.6, fill: CANVAS, background: INK }),
  "src/app/opengraph-image.png",
);
