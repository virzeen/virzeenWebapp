// Rasterises the Virzeen wordmark (the owner's apps/web/public/brand/logo/typo-white.svg shapes) to the two PNGs
// every email shows. Emails can't use SVG: Gmail and Outlook don't show it.
// - apps/web/public/brand/email-wordmark.png: ink letters on a transparent background, the light design. It has a
//   thin white halo under the fill: Gmail's apps darken the email in dark mode without telling it, so this image
//   stays on screen there and the halo keeps it readable (they never change images).
// - apps/web/public/brand/email-wordmark-dark.png: white letters, no halo. Mail apps that say they're in dark mode
//   (Apple Mail, iPhone Mail, Outlook) show it instead (owner request 2026-10-01: white in dark mode, black in light).
// Re-run after replacing the logo files:
//   node scripts/rasterise-email-wordmark.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const { chromium } = createRequire(`${repo}packages/ui/package.json`)("playwright");
const INK = "#141414"; // packages/ui/src/tokens/tokens.ts colors.ink
const CANVAS = "#ffffff"; // colors.canvas

const source = readFileSync(`${repo}apps/web/public/brand/logo/typo-white.svg`, "utf8");
const [, , artWidth, artHeight] = source
  .match(/viewBox="([^"]+)"/)[1]
  .split(/[\s,]+/)
  .map(Number);
const shapes = [...source.matchAll(/<(path|rect|polygon)\b([^>]*?)\/>/g)]
  .map(([, tag, attrs]) => `<${tag} ${attrs.replace(/\s*class="[^"]*"/g, "").trim()}/>`)
  .join("");
if (!shapes) throw new Error("No shapes found in typo-white.svg");

// The letters are 150 display px wide; the halo needs 1 px each side, so the image is 152×35 display px (the
// width/height in packages/emails/src/templates/layout.tsx), drawn at 3x. Both images share that size.
const LETTERS_PX = 150;
const unitsPerPx = artWidth / LETTERS_PX;
const pad = unitsPerPx; // 1 px
const width = artWidth + 2 * pad;
const height = artHeight + 2 * pad;
const px = (units) => Math.round(units / unitsPerPx);
const svg = ({ fill, halo }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${width} ${height}" width="${px(width)}" height="${px(height)}" preserveAspectRatio="xMidYMid meet" fill="${fill}"${
    halo ? ` stroke="${halo}" stroke-width="${2 * pad}" stroke-linejoin="round" paint-order="stroke"` : ""
  }>${shapes}</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: px(width), height: px(height) },
  deviceScaleFactor: 3,
});
for (const [file, art] of [
  ["email-wordmark.png", { fill: INK, halo: CANVAS }],
  ["email-wordmark-dark.png", { fill: CANVAS }],
]) {
  const out = `${repo}apps/web/public/brand/${file}`;
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg(art)}`,
  );
  await page.locator("svg").screenshot({ path: out, omitBackground: true });
  console.log(`Wrote ${out} (${px(width)}×${px(height)} display px at 3x)`);
}
await browser.close();
