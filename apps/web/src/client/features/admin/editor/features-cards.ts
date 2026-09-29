import { productFeatureSchema, type ProductInput } from "@virzeen/validators";

// The pure parts of "Features that perform" in the editor (specs/product-editor-on-page.md): the list operations,
// when a new feature is complete, and picture descriptions that follow the name and title.

export type Feature = ProductInput["features"][number];
export type FeaturePart = "title" | "body";
/** A feature being added: kept out of the form (and so out of saves) until it has a picture, a title and text. */
export type NewFeature = { key: string; imageUrl: string; title: string; body: string };
/** A change for commitFields. */
export type FeatureChange = { name: `features.${number}.${keyof Feature}`; value: string };

/** productSchema allows 6. */
export const MAX_FEATURES = 6;

let lastKey = 0;
/** A card's stable key: uploads and focus follow the card, not its place in the list. */
export const newFeatureKey = () => `feature-${++lastKey}`;

/** The picture description catalogService.saveProduct makes for a blank one ("{product}, {title}"). */
export const madeFeatureAlt = (name: string, title: string) => `${name.trim()}, ${title.trim()}`;

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

export const removeAt = <T>(list: readonly T[], index: number): T[] => list.filter((_, i) => i !== index);

/** A new feature is saved once it has a picture, a title and text. */
export const isComplete = (feature: Pick<NewFeature, "imageUrl" | "title" | "body">) =>
  [feature.imageUrl, feature.title, feature.body].every((text) => text.trim() !== "");

/** The new feature as the form holds it (a blank picture description: the save makes one). */
export const toFeature = ({ imageUrl, title, body }: NewFeature): Feature => ({
  imageUrl,
  title,
  body,
  alt: "",
});

/** Why a title, text or picture can't be used ("Enter a title for the feature"), or null. */
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
