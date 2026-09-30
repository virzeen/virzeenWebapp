// Rasterises the Virzeen wordmark (the owner's apps/web/public/brand/logo/typo-white.svg shapes) to the PNG every
// email shows (apps/web/public/brand/email-wordmark.png). Emails can't use SVG: Gmail and Outlook don't show it.
// Ink letters on a transparent background, with a thin white halo under the fill so the mark stays readable when
// Gmail's dark mode darkens the email background (it never inverts images). Re-run after replacing the logo files:
//   node scripts/rasterise-email-wordmark.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const { chromium } = createRequire(`${repo}packages/ui/package.json`)("playwright");
const INK = "#141414"; // packages/ui/src/tokens/tokens.ts colors.ink
const HALO = "#ffffff"; // colors.canvas

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
// width/height in packages/emails/src/templates/layout.tsx), drawn at 3x.
const LETTERS_PX = 150;
const unitsPerPx = artWidth / LETTERS_PX;
const pad = unitsPerPx; // 1 px
const width = artWidth + 2 * pad;
const height = artHeight + 2 * pad;
const px = (units) => Math.round(units / unitsPerPx);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${width} ${height}" width="${px(width)}" height="${px(height)}" preserveAspectRatio="xMidYMid meet" fill="${INK}" stroke="${HALO}" stroke-width="${2 * pad}" stroke-linejoin="round" paint-order="stroke">${shapes}</svg>`;

const out = `${repo}apps/web/public/brand/email-wordmark.png`;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: px(width), height: px(height) },
  deviceScaleFactor: 3,
});
await page.setContent(
  `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`,
);
await page.locator("svg").screenshot({ path: out, omitBackground: true });
await browser.close();
console.log(`Wrote ${out} (${px(width)}×${px(height)} display px at 3x)`);
