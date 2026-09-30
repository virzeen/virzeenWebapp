import type { ProductInput } from "@virzeen/validators";

// The form's style entries (`styles`: colour shown and style number per style) kept in step with the style list
// (specs/product-editor-on-page.md "Style tiles"). Pure; the editor sets the result with commitField/setValue.

export type StyleEntry = ProductInput["styles"][number];

const clean = (text: string | undefined) => (text ?? "").trim();
const sameName = (a: string | undefined, b: string | undefined) =>
  clean(a).toLowerCase() === clean(b).toLowerCase();

/** The entry of a style: the same spelling first, then the same name in another case; -1 when it has none. */
export function styleEntryIndex(entries: readonly StyleEntry[], style: string): number {
  const exact = entries.findIndex((entry) => clean(entry.color) === clean(style));
  return exact !== -1 ? exact : entries.findIndex((entry) => sameName(entry.color, style));
}

/**
 * The entries after adding the style `name` (useVariantOptions.addStyle made its rows). A removed style's entry with
 * the same name takes it back with its number; a product's first style takes over the entry of "no style" (so it
 * keeps -101, as the server does); otherwise a new entry, numbered when saved (`code: ""`). Never two entries with
 * one name ("Two styles have the same name").
 */
export function stylesAfterAdd(
  entries: readonly StyleEntry[],
  name: string,
  hadStyles: boolean,
): StyleEntry[] {
  const same = entries.findIndex((entry) => sameName(entry.color, name));
  const plain = hadStyles ? -1 : entries.findIndex((entry) => clean(entry.color) === "");
  const reuse = same !== -1 ? same : plain;
  if (reuse === -1) return [...entries, { color: name, colourShown: "", code: "" }];
  return entries.map((entry, index) => (index === reuse ? { ...entry, color: name } : entry));
}

/** The entries with a style's colour shown set, adding its entry when it has none yet. */
export function withColourShown(
  entries: readonly StyleEntry[],
  style: string,
  colourShown: string,
): StyleEntry[] {
  const index = styleEntryIndex(entries, style);
  if (index === -1) return [...entries, { color: style, colourShown, code: "" }];
  return entries.map((entry, i) => (i === index ? { ...entry, colourShown } : entry));
}
