"use client";

import { toast } from "@virzeen/ui";
import type { FavouriteKey } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { mergeFavouritesAction } from "@/server/actions/favourites";
import {
  addFavourite,
  FAVOURITES_FULL_MESSAGE,
  forgetStoredFavourites,
  hasFavourite,
  keyOf,
  parseFavourites,
  readStoredFavourites,
  removeFavourite,
  sameFavourites,
  subscribeToStoredFavourites,
  toKey,
  writeStoredFavourites,
} from "./favourites-store";
import { OFFLINE, useAccountFavourites } from "./use-account-favourites";

type FavouritesContextValue = {
  signedIn: boolean;
  /** The account's favourites, newest first (signed in only). */
  accountKeys: FavouriteKey[];
  /** Favourites removed with a press here that a server list still has (signed in only; `keyOf`). */
  accountRemoved: ReadonlySet<string>;
  /** Signed in, and this browser's favourites are still moving to the account (the page will refresh). */
  merging: boolean;
  toggleAccount: (key: FavouriteKey, save?: boolean) => Promise<boolean | null>;
};

export type FavouritesView = {
  signedIn: boolean;
  /** Saved products and styles, newest first: the account's when signed in, else this browser's. */
  keys: FavouriteKey[];
  count: number;
  /** False until this browser's list has been read (a guest's page, before hydration); always true signed in. */
  ready: boolean;
  merging: boolean;
  isSaved: (productId: string, color: string) => boolean;
  /**
   * True once "Remove" (or Favourite) took it away here. Not the same as `!isSaved`: signed in, a favourite saved on
   * another device since the site layout was rendered is saved, though the layout's list doesn't have it yet.
   */
  isRemoved: (productId: string, color: string) => boolean;
  /**
   * Saves the product and style, or removes it when it's saved. Resolves to the new state, or null when it didn't
   * work (a toast has said why and the button shows the old state again).
   */
  toggle: (productId: string, color: string) => Promise<boolean | null>;
  /** Removes the product and style (the Favourites page's "Remove"); resolves like toggle. */
  remove: (productId: string, color: string) => Promise<boolean | null>;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

/**
 * After sign-in the browser's favourites go to the account, then leave the browser: one request at a time, even
 * when Strict Mode runs the effect twice; a failure keeps them for the next page load. When that changed the
 * account's list the page refreshes, so a server-rendered list (the Favourites page) shows them. True until then.
 * It reads the browser's list in effects only: state set during hydration would change the context above parts of
 * the page still streaming in, and React would draw those parts again from scratch.
 */
function useGuestMerge(signedIn: boolean, accountKeys: FavouriteKey[]) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const latestKeys = useRef(accountKeys);
  useEffect(() => {
    latestKeys.current = accountKeys;
  });

  useEffect(() => {
    if (!signedIn) return;
    function merge() {
      if (running.current) return;
      const guestList = parseFavourites(readStoredFavourites());
      if (guestList.length === 0) return;
      running.current = true;
      setPending(true);
      void mergeFavouritesAction({ keys: guestList.map(toKey) })
        .catch(() => OFFLINE) // offline: they stay in the browser for the next page load
        .then((result) => {
          if (!result.ok) return;
          // Started before the list leaves the browser, so `merging` stays true until the new page is in.
          if (!sameFavourites(result.data, latestKeys.current)) startRefresh(() => router.refresh());
          // Only the ones sent: any saved meanwhile (a tab still showing the signed-out page) go next time.
          forgetStoredFavourites(guestList);
        })
        .finally(() => {
          running.current = false;
          setPending(false);
        });
    }
    merge();
    // Also when favourites reach this browser while signed in (another tab still showing the signed-out page).
    return subscribeToStoredFavourites(merge);
  }, [signedIn, router]);

  return signedIn && (pending || refreshing);
}

/**
 * Favourites for every Favourite button and the Favourites page (specs/favourites.md). Signed in: the account's,
 * from the server, changed optimistically through setFavouriteAction. Guest: this browser's, read by each
 * `useFavourites` (every tab follows). On the first load after sign-in the browser's list moves to the account.
 * The context only changes when the account's list or a merge does, never just because the page hydrated.
 */
export function FavouritesProvider({
  signedIn,
  initialKeys,
  children,
}: {
  signedIn: boolean;
  initialKeys: FavouriteKey[];
  children: React.ReactNode;
}) {
  const account = useAccountFavourites(initialKeys);
  const merging = useGuestMerge(signedIn, account.keys);
  // The latest toggle through a ref, so the context value doesn't change on every render.
  const toggleRef = useRef(account.toggle);
  useEffect(() => {
    toggleRef.current = account.toggle;
  });

  const value = useMemo<FavouritesContextValue>(
    () => ({
      signedIn,
      accountKeys: account.keys,
      accountRemoved: account.removed,
      merging,
      toggleAccount: (key, save) => toggleRef.current(key, save),
    }),
    [signedIn, account.keys, account.removed, merging],
  );

  return <FavouritesContext value={value}>{children}</FavouritesContext>;
}

/** This browser's list, and whether it has been read: not while rendering on the server or hydrating. */
function useStoredFavourites() {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribeToStoredFavourites,
    readStoredFavourites,
    () => undefined,
  );
  const stored = useMemo(() => parseFavourites(raw ?? null), [raw]);
  return { stored, ready: raw !== undefined };
}

/** Saves (`save`, else when it isn't saved yet) or removes in this browser's list. */
function setGuest(key: FavouriteKey, save?: boolean) {
  const list = parseFavourites(readStoredFavourites());
  const has = hasFavourite(list, key);
  if (!(save ?? !has)) {
    if (has) writeStoredFavourites(removeFavourite(list, key));
    return false;
  }
  if (has) return true;
  const next = addFavourite(list, key, new Date().toISOString());
  if (!next) {
    toast.error(FAVOURITES_FULL_MESSAGE);
    return null;
  }
  writeStoredFavourites(next);
  return true;
}

export function useFavourites(): FavouritesView {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used inside <FavouritesProvider>.");
  const { stored, ready } = useStoredFavourites();
  const guestKeys = useMemo(() => stored.map(toKey), [stored]);
  const keys = ctx.signedIn ? ctx.accountKeys : guestKeys;
  const saved = useMemo(() => new Set(keys.map(keyOf)), [keys]);
  const set = (key: FavouriteKey, save?: boolean) =>
    ctx.signedIn ? ctx.toggleAccount(key, save) : Promise.resolve(setGuest(key, save));
  return {
    signedIn: ctx.signedIn,
    keys,
    count: keys.length,
    ready: ctx.signedIn || ready,
    merging: ctx.merging,
    isSaved: (productId, color) => saved.has(keyOf({ productId, color })),
    // A guest's list is this browser's, so anything not in it has been removed (here or in another tab).
    isRemoved: (productId, color) =>
      ctx.signedIn
        ? ctx.accountRemoved.has(keyOf({ productId, color }))
        : !saved.has(keyOf({ productId, color })),
    toggle: (productId, color) => set({ productId, color }),
    remove: (productId, color) => set({ productId, color }, false),
  };
}
