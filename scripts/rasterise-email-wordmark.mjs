// Rasterises the Virzeen wordmark (apps/web/src/client/components/layout/wordmark.tsx) to the PNG every email shows
// (apps/web/public/brand/email-wordmark.png). Emails can't use SVG: Gmail and Outlook don't show it.
// Ink letters on a transparent background, with a thin white halo under the fill so the mark stays readable when
// Gmail's dark mode darkens the email background (it never inverts images). Re-run after changing wordmark.tsx:
//   node scripts/rasterise-email-wordmark.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const { chromium } = createRequire(`${repo}packages/ui/package.json`)("playwright");
const INK = "#141414"; // packages/ui/src/tokens/tokens.ts colors.ink
const HALO = "#ffffff"; // colors.canvas

const source = readFileSync(`${repo}apps/web/src/client/components/layout/wordmark.tsx`, "utf8");
const paths = [...source.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);
if (paths.length === 0) throw new Error("No <path d> found in wordmark.tsx");

// The letters are 150x33 display px (viewBox 2400x528, so 16 units = 1 px). The halo needs 1 px each side: the
// image is 152x35 display px (the width/height in packages/emails/src/templates/layout.tsx), drawn at 3x.
const PAD = 16;
const width = 2400 + 2 * PAD;
const height = 528 + 2 * PAD;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${width} ${height}" width="${width / 16}" height="${height / 16}" fill="${INK}" fill-rule="evenodd" stroke="${HALO}" stroke-width="${2 * PAD}" stroke-linejoin="round" paint-order="stroke">${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;

const out = `${repo}apps/web/public/brand/email-wordmark.png`;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: width / 16, height: height / 16 },
  deviceScaleFactor: 3,
});
await page.setContent(
  `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`,
);
await page.locator("svg").screenshot({ path: out, omitBackground: true });
await browser.close();
console.log(`Wrote ${out}`);
