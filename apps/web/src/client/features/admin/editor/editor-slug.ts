import { slugify } from "../slugify";

// While a draft has never been published, its URL slug follows its name (specs/product-editor-on-page.md). Once it
// has been published (links may be out there) or the slug was typed by hand, it stays.

/** The number after `base` in "base-3", or null when `slug` isn't `base` with a number added. */
function counterAfter(slug: string, base: string): number | null {
  const rest = slug.startsWith(`${base}-`) ? slug.slice(base.length + 1) : "";
  return /^\d+$/.test(rest) ? Number(rest) : null;
}

/** True when `slug` is the one made from `name`, or that with a number added ("linen-shirt-2") because it was taken. */
export function slugFollowsName(slug: string, name: string): boolean {
  const base = slugify(name);
  return base !== "" && (slug === base || counterAfter(slug, base) !== null);
}

/** The slug for a new name; the current one when nothing usable is left of the name (e.g. only symbols). */
export const slugForName = (name: string, current: string) => slugify(name) || current;

/**
 * The next slug to try when this one, made from `name`, is taken: "tee" → "tee-2", "tee-2" → "tee-3". A number that
 * is part of the name stays ("summer-2026" → "summer-2026-2").
 */
export function nextSlug(slug: string, name: string): string {
  const base = slugify(name) || slug;
  const counter = counterAfter(slug, base);
  return `${base}-${counter === null ? 2 : counter + 1}`;
}
