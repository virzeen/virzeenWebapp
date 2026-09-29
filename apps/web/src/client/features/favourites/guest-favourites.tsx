"use client";

import type { FavouriteKey } from "@virzeen/validators";
import { useEffect, useState } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { listFavouriteProductsAction, type FavouriteView } from "@/server/actions/favourites";
import { FavouritesList } from "./favourites-list";
import { useFavourites } from "./favourites-provider";
import { forgetStoredFavourites, keyOf } from "./favourites-store";
import { OFFLINE } from "./use-account-favourites";

type Looked = {
  /** The product cards found, by favourite key. */
  views: ReadonlyMap<string, FavouriteView>;
  /** Every key already looked up, found or not. */
  asked: ReadonlySet<string>;
  /** What the last lookup didn't find: products no longer on sale. */
  gone: FavouriteKey[];
};

const NOTHING_YET: Looked = { views: new Map(), asked: new Set(), gone: [] };

/**
 * A guest's Favourites page. The list lives in this browser, so the product cards are looked up here, in the
 * list's order; a key added later (another tab) is looked up on its own. Favourites whose product is no longer
 * on sale leave the browser's list, so they can't fill it up out of sight.
 */
export function GuestFavourites() {
  const { keys, ready } = useFavourites();
  const [looked, setLooked] = useState(NOTHING_YET);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const missing = keys.filter((key) => !looked.asked.has(keyOf(key)));

  useEffect(() => {
    const wanted = keys.filter((key) => !looked.asked.has(keyOf(key)));
    if (!ready || wanted.length === 0) return;
    let current = true;
    void listFavouriteProductsAction({ keys: wanted })
      .catch(() => OFFLINE)
      .then((result) => {
        if (!current) return;
        if (!result.ok) return setError(messageFor(result.error));
        const found = new Map(result.data.map((view) => [keyOf(view), view]));
        setError(null);
        setLooked((before) => ({
          views: new Map([...before.views, ...found]),
          asked: new Set([...before.asked, ...wanted.map(keyOf)]),
          gone: wanted.filter((key) => !found.has(keyOf(key))),
        }));
      });
    return () => {
      current = false;
    };
  }, [ready, keys, looked.asked, attempt]);

  // Out of the browser's list once they count as looked up, so the shorter list doesn't start another lookup.
  useEffect(() => {
    if (looked.gone.length > 0) forgetStoredFavourites(looked.gone);
  }, [looked.gone]);

  const items = keys.flatMap((key) => looked.views.get(keyOf(key)) ?? []);
  // Nothing to show until the browser's list is read and its first cards are in.
  const waiting = !ready || (missing.length > 0 && items.length === 0);

  return (
    <FavouritesList
      items={waiting ? null : items}
      expected={ready ? keys.length : undefined}
      error={error}
      onRetry={() => {
        setError(null);
        setAttempt((n) => n + 1);
      }}
    />
  );
}
