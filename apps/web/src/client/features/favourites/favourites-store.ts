import { favouriteKeySchema, MAX_FAVOURITES, type FavouriteKey } from "@virzeen/validators";

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
    const key = favouriteKeySchema.safeParse({ productId, color });
    if (!key.success || typeof savedAt !== "string" || seen.has(keyOf(key.data))) continue;
    seen.add(keyOf(key.data));
    list.push({ ...key.data, savedAt });
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
