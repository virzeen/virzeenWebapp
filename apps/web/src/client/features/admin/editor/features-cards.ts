import { MAX_FEATURES, productFeatureSchema, type ProductInput } from "@virzeen/validators";

// The pure parts of "Features that perform" in the editor (specs/product-editor-on-page.md, product-page-v2.md): the
// list operations, a new feature, and picture descriptions that follow the name and title.

export type Feature = ProductInput["features"][number];
export type FeaturePart = "title" | "body";
/** A change for commitFields. */
export type FeatureChange = { name: `features.${number}.${keyof Feature}`; value: string };

/** productSchema allows 9 (specs/product-page-v2.md). */
export { MAX_FEATURES };

let lastKey = 0;
/** A card's stable key: uploads and focus follow the card, not its place in the list. */
export const newFeatureKey = () => `feature-${++lastKey}`;

/**
 * The picture description catalogService.saveProduct makes for a blank one: "{product}, {title}", or "{product}"
 * for a feature without a title (specs/product-page-v2.md).
 */
export const madeFeatureAlt = (name: string, title: string) =>
  title.trim() ? `${name.trim()}, ${title.trim()}` : name.trim();

/**
 * True when the picture description is blank or the one made from the name and title. getProductForEdit returns
 * made ones as if typed; the editor shows them as the placeholder and saves "", so they follow renames.
 */
export function altIsMade(alt: string | undefined, name: string, title: string) {
  const text = (alt ?? "").trim();
  return text === "" || text === madeFeatureAlt(name, title);
}

/** The list with the item at `from` moved to `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item === undefined || to < 0 || to > list.length - 1) return [...list];
  next.splice(to, 0, item);
  return next;
}

/**
 * The list and its card keys with the card keyed `key` moved to place `to` (Move earlier / Move later, or a drag and
 * drop), kept in step. Null when nothing moves: dropped where it was, `to` outside the list, or an unknown key.
 */
export function moveKeyed<T>(list: readonly T[], keys: readonly string[], key: string, to: number) {
  const from = keys.indexOf(key);
  if (from < 0 || from === to || to < 0 || to >= list.length || keys.length !== list.length) return null;
  return { list: moveItem(list, from, to), keys: moveItem(keys, from, to) };
}

/** A card's name in its buttons and messages: the title, or "feature {n}" without one. */
export const featureName = (title: string, index: number) => title.trim() || `feature ${index + 1}`;

/** What screen readers hear after a drop (`to` counts from 0): "Moved Breathes to position 2 of 5". */
export const movedMessage = (name: string, to: number, total: number) =>
  `Moved ${name} to position ${to + 1} of ${total}`;

export const removeAt = <T>(list: readonly T[], index: number): T[] => list.filter((_, i) => i !== index);

/**
 * A new feature: only its picture, which is all a feature needs (specs/product-page-v2.md), so it joins the list and
 * saves straight away. Title and text can be added later; the save makes the picture description.
 */
export const newFeature = (imageUrl: string): Feature => ({ imageUrl, title: "", body: "", alt: "" });

/** Why a title, text or picture can't be used ("Keep the title under 60 characters"), or null. */
export function featurePartProblem(part: FeaturePart | "imageUrl", value: string): string | null {
  const checked = productFeatureSchema.shape[part].safeParse(value);
  return checked.success ? null : (checked.error.issues[0]?.message ?? null);
}

/**
 * The changes for a new title or text on a saved feature. A new title also clears a made picture description, so the
 * save makes it again from the new title.
 */
export function partChanges(
  index: number,
  feature: Feature,
  part: FeaturePart,
  value: string,
  productName: string,
): FeatureChange[] {
  const changes: FeatureChange[] = [{ name: `features.${index}.${part}`, value }];
  if (part === "title" && (feature.alt ?? "") !== "" && altIsMade(feature.alt, productName, feature.title)) {
    changes.push({ name: `features.${index}.alt`, value: "" });
  }
  return changes;
}

/**
 * For a product rename (the name's own commit): clears every picture description made from the old name, so the
 * save makes them again from the new one.
 */
export const featureAltResets = (features: readonly Feature[], oldName: string): FeatureChange[] =>
  features.flatMap((feature, index) =>
    (feature.alt ?? "") !== "" && altIsMade(feature.alt, oldName, feature.title)
      ? [{ name: `features.${index}.alt` as const, value: "" }]
      : [],
  );
