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
 * "Favourites" under the bag, like Nike's: up to two cards side by side from md (the photo on the left; the name and
 * price, "Category · Style" and the bag pill on the right), then "View more favourites" when there are more.
 */
export function BagFavourites({ preview }: { preview: FavouritesPreview }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <h2 id={headingId} className="font-display text-h2">
        Favourites
      </h2>
      <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-6">
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

/** One favourite laid out like a bag line: the photo, then the name with the price, the details and the pill. */
function BagFavourite({ item }: { item: FavouriteView }) {
  const { product } = item;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 sm:gap-x-6">
      <Link href={favouriteHref(item)} variant="subtle" className="w-28 sm:w-36 lg:w-40">
        <CloudImage src={product.imageUrl} alt={product.imageAlt} sizes="(min-width: 1024px) 160px, 144px" />
      </Link>
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
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
