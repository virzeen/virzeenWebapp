import type { ProductInput } from "@virzeen/validators";

// What the editor takes from a finished save (catalogService.saveProduct's `values`): the variant ids, the SKUs and
// photo descriptions the server made, and the style numbers. Pure functions; the autosave hook applies the patches
// with form.setValue.

/** One change for form.setValue: a dotted path ("slug", "variants") and its new value. */
export type Patch = { path: string; value: unknown };

type Row = ProductInput["variants"][number];
type Style = ProductInput["styles"][number];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const clean = (text: string | undefined) => (text ?? "").trim().toLowerCase();
const same = (a: string | undefined, b: string | undefined) => clean(a) === clean(b);

/** Deep equality for form values; NaN (a blank number box) equals NaN. */
export function sameValues(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValues(item, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => sameValues(a[key], b[key]));
  }
  return false;
}

/**
 * The patches that turn `current` into `target`, as small as possible. Objects are compared key by key, and so are
 * lists of objects of the same length (a row's new id is one patch, "variants.3.id"), so a field array isn't
 * rebuilt and its items keep their keys (focus stays where it is). A list whose length changed, or a list of plain
 * values that differs, is replaced whole.
 */
export function diffPaths(current: unknown, target: unknown, path = ""): Patch[] {
  const at = (key: string | number) => (path ? `${path}.${key}` : String(key));
  if (isObject(current) && isObject(target)) {
    return Object.keys(target).flatMap((key) => diffPaths(current[key], target[key], at(key)));
  }
  if (
    Array.isArray(current) &&
    Array.isArray(target) &&
    current.length === target.length &&
    target.every(isObject) &&
    current.every(isObject)
  ) {
    return target.flatMap((item, index) => diffPaths(current[index], item, at(index)));
  }
  return sameValues(current, target) ? [] : [{ path, value: target }];
}

const rowKey = (row: Row) => `${clean(row.size)}|${clean(row.color)}`;

/** The row of `rows` (from the request) the admin's `row` at `index` still is: same size and style, else same place. */
function sentIndexFor(row: Row, index: number, sent: readonly Row[], current: readonly Row[]) {
  const byKey = sent.findIndex((candidate) => !candidate.id && rowKey(candidate) === rowKey(row));
  if (byKey !== -1) return byKey;
  // Same number of rows and the one in this place was new: the admin renamed its size or style meanwhile.
  return sent.length === current.length && !sent[index]?.id ? index : -1;
}

/** New rows get the ids the save gave them; rows whose blank SKU was made get it. */
function patchRows(sent: readonly Row[], current: readonly Row[], saved: readonly Row[]): Row[] {
  const sentIds = new Set(sent.flatMap((row) => (row.id ? [row.id] : [])));
  return current.map((row, index) => {
    if (row.id) return row;
    const from = sentIndexFor(row, index, sent, current);
    const sentRow = sent[from];
    if (!sentRow) return row;
    // saveProduct keeps the order of the rows it was sent.
    const match =
      saved.length === sent.length
        ? saved[from]
        : saved.find(
            (candidate) => !sentIds.has(candidate.id ?? "") && rowKey(candidate) === rowKey(sentRow),
          );
    if (!match?.id) return row;
    const madeSku = row.sku.trim() === "" && sentRow.sku.trim() === "";
    return { ...row, id: match.id, sku: madeSku ? match.sku : row.sku };
  });
}

/**
 * Style entries keep their numbers: a new entry gets the number the save gave its name (or the name it had when it
 * was sent, if renamed meanwhile); an entry the server renamed (a product's first style takes over the number of
 * the "no style" entry) takes the new name unless the admin renamed it too; entries the server added for styles the
 * rows use are added.
 */
function patchStyles(
  sent: readonly Style[],
  current: readonly Style[],
  saved: readonly Style[],
  rows: readonly Row[],
): Style[] {
  const taken = new Set(current.flatMap((entry) => (entry.code ? [entry.code] : [])));
  const merged = current.map((entry, index) => {
    if (entry.code) {
      const was = sent.find((candidate) => candidate.code === entry.code);
      const now = saved.find((candidate) => candidate.code === entry.code);
      return was && now && same(was.color, entry.color) && !same(was.color, now.color)
        ? { ...entry, color: now.color }
        : entry;
    }
    const sentEntry = sent[index];
    const name = saved.some((candidate) => same(candidate.color, entry.color))
      ? entry.color
      : sentEntry && !sentEntry.code
        ? sentEntry.color
        : undefined;
    const now = name === undefined ? undefined : saved.find((candidate) => same(candidate.color, name));
    if (!now?.code || taken.has(now.code)) return entry;
    taken.add(now.code);
    return { ...entry, code: now.code };
  });
  const styleNames = rows.map((row) => row.color ?? "");
  const added = saved.filter(
    (entry) =>
      !merged.some((candidate) => candidate.code === entry.code || same(candidate.color, entry.color)) &&
      styleNames.some((name) => same(name, entry.color)),
  );
  return [...merged, ...added];
}

const isBlank = (item: { alt?: string | undefined }) => (item.alt ?? "").trim() === "";

/**
 * Blank photo (and feature picture) descriptions take the ones the save made, matched by picture. Only pictures
 * sent blank got one made: a description cleared meanwhile (a new title or name, so it's made again) stays blank.
 */
function patchAlts<T extends { alt?: string | undefined }>(
  sent: readonly T[],
  current: readonly T[],
  saved: readonly T[],
  key: (item: T) => string,
): T[] {
  const sentBlank = new Map<string, number>();
  for (const item of sent.filter(isBlank)) sentBlank.set(key(item), (sentBlank.get(key(item)) ?? 0) + 1);
  const used = new Set<number>();
  return current.map((item) => {
    const left = sentBlank.get(key(item)) ?? 0;
    if (!isBlank(item) || left === 0) return item;
    const index = saved.findIndex((candidate, i) => !used.has(i) && key(candidate) === key(item));
    const match = saved[index];
    if (!match) return item;
    used.add(index);
    sentBlank.set(key(item), left - 1);
    return { ...item, alt: match.alt };
  });
}

/**
 * A save finished while the admin kept editing: `sent` went out, `saved` came back, `current` is the form now.
 * Only what the server made is taken (ids, SKUs, style numbers, photo descriptions, a changed slug); every edit made
 * meanwhile stays. The caller saves again afterwards.
 */
export function savedPatches(sent: ProductInput, current: ProductInput, saved: ProductInput): Patch[] {
  const next: Partial<ProductInput> = {
    variants: patchRows(sent.variants, current.variants, saved.variants),
    styles: patchStyles(sent.styles, current.styles, saved.styles, current.variants),
    images: patchAlts(
      sent.images,
      current.images,
      saved.images,
      (image) => `${image.url}|${clean(image.color)}`,
    ),
    features: patchAlts(sent.features, current.features, saved.features, (feature) => feature.imageUrl),
  };
  if (current.slug === sent.slug && saved.slug !== sent.slug) next.slug = saved.slug;
  return diffPaths(current, next);
}
