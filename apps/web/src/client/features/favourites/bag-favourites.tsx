"use client";

import { ButtonLink, Link } from "@virzeen/ui";
import { useEffect, useId, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { listFavouriteProductsAction, type FavouriteView } from "@/server/actions/favourites";
import {
  BAG_FAVOURITES_SHOWN,
  favouriteDetails,
  favouriteHref,
  type FavouritesPreview,
} from "./favourite-bag";
import { FavouriteBagButton } from "./favourite-bag-button";
import { useFavourites } from "./favourites-provider";
import { keyOf } from "./favourites-store";
import { OFFLINE } from "./use-account-favourites";

const NO_FAVOURITES: FavouritesPreview = { items: [], total: 0 };

/**
 * The bag page's favourites (patterns.md §7). Signed in: `account`, read on the server. A guest's live in this
 * browser, so the first few are looked up here (a few more than are shown, in case some are no longer on sale), and
 * again when they change (the heart on a bag line). null until a guest's are known.
 */
export function useFavouritesPreview(account: FavouritesPreview | null): FavouritesPreview | null {
  const { keys, ready } = useFavourites();
  const [looked, setLooked] = useState<FavouritesPreview | null>(null);
  const guest = account === null;

  useEffect(() => {
    if (!guest || !ready || keys.length === 0) return;
    let current = true;
    void listFavouriteProductsAction({ keys: keys.slice(0, BAG_FAVOURITES_SHOWN + 4) })
      .catch(() => OFFLINE)
      .then((result) => {
        if (!current) return;
        // A lookup that failed shows no favourites, so the page suggests products instead.
        const items = result.ok ? result.data.slice(0, BAG_FAVOURITES_SHOWN) : [];
        setLooked({ items, total: keys.length });
      });
    return () => {
      current = false;
    };
  }, [guest, ready, keys]);

  if (account) return account;
  if (!ready) return null;
  if (keys.length === 0) return NO_FAVOURITES;
  // The last answer while a new one is on its way (it only changes after a heart is pressed).
  return looked;
}

/**
 * "Favourites" under the bag: a row of cards (owner request 2026-11-11, replacing the photo-left, text-right layout):
 * 2 a row on phones, 4 from md, each with the photo on top, then the name with the price, "Category · Style" and the
 * bag pill. "View more favourites" follows when there are more.
 */
export function BagFavourites({ preview }: { preview: FavouritesPreview }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <h2 id={headingId} className="font-display text-h2">
        Favourites
      </h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
        {preview.items.map((item) => (
          <BagFavourite key={keyOf(item)} item={item} />
        ))}
      </ul>
      {preview.total > preview.items.length && (
        <div className="border-t border-line pt-2">
          <ButtonLink href="/favourites" variant="underline">
            View more favourites
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

/** One favourite as a card in the row: the photo on top, then the name with the price, the details and the pill. */
function BagFavourite({ item }: { item: FavouriteView }) {
  const { product } = item;
  return (
    <li className="flex min-w-0 flex-col gap-3">
      <Link href={favouriteHref(item)} variant="subtle" className="block w-full">
        <CloudImage src={product.imageUrl} alt={product.imageAlt} sizes="(min-width: 768px) 25vw, 50vw" />
      </Link>
      <div className="flex flex-col gap-1">
        <div className="flex flex-col items-start gap-1 md:flex-row md:justify-between md:gap-4">
          {/* A long one-word name ("Monochromium") breaks instead of running into the price at 320px. */}
          <Link
            href={favouriteHref(item)}
            variant="subtle"
            className="min-w-0 text-body font-medium wrap-anywhere hyphens-auto text-ink hover:text-ink-muted"
          >
            {product.name}
          </Link>
          <Price paisa={product.fromPricePaisa} className="shrink-0 text-body font-medium" />
        </div>
        <p className="text-body text-ink-muted">{favouriteDetails(item)}</p>
        <div className="pt-3">
          <FavouriteBagButton item={item} />
        </div>
      </div>
    </li>
  );
}
