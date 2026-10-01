import type { FavouriteKey } from "@virzeen/validators";
// The zod-free limits: this file is read on every page, and the schemas would bring zod with them.
import { MAX_FAVOURITES, toFavouriteKey } from "@virzeen/validators/limits";

// A guest's favourites live in this browser (specs/favourites.md): a list of { productId, color, savedAt }, newest
// first, at most MAX_FAVOURITES. The list helpers are pure; the storage helpers below them never throw.

export const FAVOURITES_STORAGE_KEY = "virzeen:favourites";

/** Same words as the account's limit (favouriteService.set). */
export const FAVOURITES_FULL_MESSAGE = `You can save up to ${MAX_FAVOURITES} favourites. Remove one to add another.`;

/** A favourite kept in the browser; `savedAt` is an ISO time. */
export type StoredFavourite = FavouriteKey & { savedAt: string };

/** One string per product and style, for comparing favourites. */
export const keyOf = (key: FavouriteKey) => `${key.productId}:${key.color}`;

/** Just the product and style, as the server actions take them (their schemas refuse extra fields). */
export const toKey = ({ productId, color }: FavouriteKey): FavouriteKey => ({ productId, color });

/**
 * The stored list, or an empty one when it's missing or not JSON. Entries the server would refuse (a bad id or
 * style) and repeats are dropped, so the list can always be sent to the server as it is.
 */
export function parseFavourites(raw: string | null): StoredFavourite[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const list: StoredFavourite[] = [];
  for (const entry of data as unknown[]) {
    if (typeof entry !== "object" || entry === null) continue;
    const { productId, color, savedAt } = entry as Record<string, unknown>;
    const key = toFavouriteKey(productId, color);
    if (!key || typeof savedAt !== "string" || seen.has(keyOf(key))) continue;
    seen.add(keyOf(key));
    list.push({ ...key, savedAt });
    if (list.length === MAX_FAVOURITES) break;
  }
  return list;
}

export const hasFavourite = (list: readonly FavouriteKey[], key: FavouriteKey) =>
  list.some((item) => keyOf(item) === keyOf(key));

/** The list with `key` saved at the top; unchanged when it's saved already; null when the list is full. */
export function addFavourite(
  list: readonly StoredFavourite[],
  key: FavouriteKey,
  savedAt: string,
): StoredFavourite[] | null {
  if (hasFavourite(list, key)) return [...list];
  if (list.length >= MAX_FAVOURITES) return null;
  return [{ ...toKey(key), savedAt }, ...list];
}

export const removeFavourite = (list: readonly StoredFavourite[], key: FavouriteKey) =>
  list.filter((item) => keyOf(item) !== keyOf(key));

/** The list without any of `keys` (a guest's favourites of products no longer on sale). */
export function withoutFavourites(list: readonly StoredFavourite[], keys: readonly FavouriteKey[]) {
  const gone = new Set(keys.map(keyOf));
  return list.filter((item) => !gone.has(keyOf(item)));
}

/** True when both lists hold the same products and styles, in any order. */
export function sameFavourites(a: readonly FavouriteKey[], b: readonly FavouriteKey[]) {
  const ids = new Set(a.map(keyOf));
  return ids.size === new Set(b.map(keyOf)).size && b.every((key) => ids.has(keyOf(key)));
}

// ── A signed-in customer's presses still being saved ──

/** One press of Favourite: save or remove. `done` once the server has saved it. */
export type FavouriteChange = { key: FavouriteKey; save: boolean; done: boolean };

/** The account's list as the customer sees it: presses being saved applied on top (new saves first). */
export function applyChanges(
  keys: FavouriteKey[],
  changes: ReadonlyMap<string, FavouriteChange>,
): FavouriteKey[] {
  if (changes.size === 0) return keys;
  const listed = new Set(keys.map(keyOf));
  const added = [...changes.values()]
    .filter((change) => change.save && !listed.has(keyOf(change.key)))
    .map((change) => change.key)
    .reverse();
  return [...added, ...keys.filter((key) => changes.get(keyOf(key))?.save !== false)];
}

/**
 * The presses a fresh server list doesn't cover yet. Saved ones and ones it already shows are dropped; the rest
 * stay, so a list rendered before a later press finished can't undo it. Unchanged → the same map.
 */
export function settleChanges(
  changes: ReadonlyMap<string, FavouriteChange>,
  serverKeys: readonly FavouriteKey[],
): ReadonlyMap<string, FavouriteChange> {
  const listed = new Set(serverKeys.map(keyOf));
  const open = [...changes].filter(([id, change]) => !change.done && listed.has(id) !== change.save);
  return open.length === changes.size ? changes : new Map(open);
}

// ── Browser storage ──
// When the browser refuses to store the list (blocked or full), it lasts for this visit instead.

let visitOnly: string | null | undefined;
const listeners = new Set<() => void>();

/** The stored list as text: stable between changes, so useSyncExternalStore can compare it. */
export function readStoredFavourites(): string | null {
  if (visitOnly !== undefined) return visitOnly;
  try {
    return window.localStorage.getItem(FAVOURITES_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Saves the list (null clears it) and tells this tab's subscribers; other tabs hear the storage event. */
export function writeStoredFavourites(list: readonly StoredFavourite[] | null) {
  const raw = list && list.length > 0 ? JSON.stringify(list) : null;
  try {
    if (raw === null) window.localStorage.removeItem(FAVOURITES_STORAGE_KEY);
    else window.localStorage.setItem(FAVOURITES_STORAGE_KEY, raw);
    visitOnly = undefined;
  } catch {
    visitOnly = raw;
  }
  for (const listener of listeners) listener();
}

/** Takes `keys` out of the stored list; writes (and tells the tabs) only when one was there. */
export function forgetStoredFavourites(keys: readonly FavouriteKey[]) {
  const list = parseFavourites(readStoredFavourites());
  const kept = withoutFavourites(list, keys);
  if (kept.length !== list.length) writeStoredFavourites(kept);
}

/** Calls `onChange` when the list changes in this tab or another one. */
export function subscribeToStoredFavourites(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    // key null: the site's storage was cleared.
    if (event.key === FAVOURITES_STORAGE_KEY || event.key === null) onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
