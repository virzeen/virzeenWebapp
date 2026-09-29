"use client";

import { toast } from "@virzeen/ui";
import type { FavouriteKey } from "@virzeen/validators";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { mergeFavouritesAction, setFavouriteAction } from "@/server/actions/favourites";
import {
  addFavourite,
  FAVOURITES_FULL_MESSAGE,
  hasFavourite,
  keyOf,
  parseFavourites,
  readStoredFavourites,
  removeFavourite,
  subscribeToStoredFavourites,
  toKey,
  writeStoredFavourites,
} from "./favourites-store";

type FavouritesContextValue = {
  signedIn: boolean;
  /** Saved products and styles, newest first: the account's when signed in, else this browser's. */
  keys: FavouriteKey[];
  count: number;
  isSaved: (productId: string, color: string) => boolean;
  /**
   * Saves the product and style, or removes it when it's saved. Resolves to the new state, or null when it didn't
   * work (a toast has said why and the button shows the old state again).
   */
  toggle: (productId: string, color: string) => Promise<boolean | null>;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

const OFFLINE = { ok: false, error: { code: "INTERNAL", message: "" } } as const;

/** The browser's list; empty while rendering on the server and during hydration. */
function useStoredFavourites() {
  const raw = useSyncExternalStore(subscribeToStoredFavourites, readStoredFavourites, () => null);
  return useMemo(() => parseFavourites(raw), [raw]);
}

/**
 * Favourites for every Favourite button and the Favourites page (specs/favourites.md). Signed in: the account's,
 * from the server, changed optimistically through setFavouriteAction. Guest: this browser's (every tab follows).
 * On the first load after sign-in the browser's list moves to the account.
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
  const stored = useStoredFavourites();
  const [serverKeys, setServerKeys] = useState(initialKeys);
  const [accountKeys, setAccountKeys] = useState(initialKeys);
  // Fresh server data wins whenever the layout re-renders (React "adjust state when a prop changes" pattern).
  if (initialKeys !== serverKeys) {
    setServerKeys(initialKeys);
    setAccountKeys(initialKeys);
  }

  // After sign-in: the browser's favourites go to the account, then leave the browser. Once per sign-in, even when
  // Strict Mode runs the effect twice; a failure keeps them for the next page load.
  const merging = useRef(false);
  useEffect(() => {
    if (!signedIn || merging.current) return;
    const guestList = parseFavourites(readStoredFavourites());
    if (guestList.length === 0) return;
    merging.current = true;
    void mergeFavouritesAction({ keys: guestList.map(toKey) })
      .then((result) => {
        if (!result.ok) return;
        writeStoredFavourites(null);
        setAccountKeys(result.data);
      })
      .catch(() => undefined) // offline: they stay in the browser
      .finally(() => {
        merging.current = false;
      });
  }, [signedIn]);

  const keys = useMemo(() => (signedIn ? accountKeys : stored.map(toKey)), [signedIn, accountKeys, stored]);
  const saved = useMemo(() => new Set(keys.map(keyOf)), [keys]);

  function toggleGuest(key: FavouriteKey) {
    const list = parseFavourites(readStoredFavourites());
    if (hasFavourite(list, key)) {
      writeStoredFavourites(removeFavourite(list, key));
      return false;
    }
    const next = addFavourite(list, key, new Date().toISOString());
    if (!next) {
      toast.error(FAVOURITES_FULL_MESSAGE);
      return null;
    }
    writeStoredFavourites(next);
    return true;
  }

  async function toggleAccount(key: FavouriteKey) {
    const id = keyOf(key);
    const index = accountKeys.findIndex((item) => keyOf(item) === id);
    const save = index === -1;
    setAccountKeys((current) => (save ? [key, ...current] : current.filter((item) => keyOf(item) !== id)));
    // A dropped connection counts as a failure on our side.
    const result = await setFavouriteAction({ ...key, saved: save }).catch(() => OFFLINE);
    if (result.ok) return save;
    // Back as it was, unless another press has changed it since.
    setAccountKeys((current) => {
      const isSaved = current.some((item) => keyOf(item) === id);
      if (isSaved !== save) return current;
      if (save) return current.filter((item) => keyOf(item) !== id);
      return [...current.slice(0, index), key, ...current.slice(index)];
    });
    toast.error(messageFor(result.error));
    return null;
  }

  const value: FavouritesContextValue = {
    signedIn,
    keys,
    count: keys.length,
    isSaved: (productId, color) => saved.has(keyOf({ productId, color })),
    toggle: (productId, color) =>
      signedIn ? toggleAccount({ productId, color }) : Promise.resolve(toggleGuest({ productId, color })),
  };

  return <FavouritesContext value={value}>{children}</FavouritesContext>;
}

export function useFavourites(): FavouritesContextValue {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used inside <FavouritesProvider>.");
  return ctx;
}
