"use client";

import { ButtonLink, EmptyState, Grid, Skeleton } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { FavouriteView } from "@/server/actions/favourites";
import { FavouriteCard, favouriteName } from "./favourite-card";
import { useFavourites } from "./favourites-provider";
import { FavouritesGridSkeleton } from "./favourites-skeleton";
import { keyOf } from "./favourites-store";

type FavouritesListProps = {
  /** Newest first; null while a guest's list is still loading. */
  items: FavouriteView[] | null;
  /** How many cards are on their way, for the skeleton. */
  expected?: number;
  /** Why a guest's list didn't load, with "Try again". */
  alert?: React.ReactNode;
};

const itemCount = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

/**
 * The Favourites page body (specs/favourites.md): heading, count and the saved products. "Remove" takes a card
 * away at once (the provider saves it and puts it back if that fails); keyboard focus then moves to the next
 * card's Remove, else the previous one's, else the heading, and a screen reader hears "Removed {name}.".
 */
export function FavouritesList({ items, expected, alert }: FavouritesListProps) {
  const { isSaved, toggle, merging } = useFavourites();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // The card just removed and where it was, until it has left the page.
  const removing = useRef<{ key: string; index: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Also follows presses elsewhere in this tab, and a guest's other tabs.
  const visible = items?.filter((item) => isSaved(item.productId, item.color)) ?? null;
  // Right after sign-in an empty account list may be about to get the browser's favourites.
  const loading = !alert && (visible === null || (merging && visible.length === 0));
  const cards = !loading && visible && visible.length > 0 ? visible : null;

  useLayoutEffect(() => {
    const pending = removing.current;
    if (!pending || visible?.some((item) => keyOf(item) === pending.key)) return;
    removing.current = null;
    const buttons = gridRef.current?.querySelectorAll<HTMLElement>("[data-remove-favourite]");
    (buttons?.item(pending.index) ?? buttons?.item(pending.index - 1) ?? headingRef.current)?.focus();
  });

  async function remove(item: FavouriteView, index: number) {
    removing.current = { key: keyOf(item), index };
    setAnnouncement(`Removed ${favouriteName(item)}.`);
    if ((await toggle(item.productId, item.color)) !== null) return;
    // Not saved: the card is back and a toast says why.
    removing.current = null;
    setAnnouncement("");
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-h1 focus:outline-none">
          Favourites
        </h1>
        {loading ? (
          <Skeleton shape="text" className="w-16" />
        ) : (
          cards && <p className="text-body text-ink-muted">{itemCount(cards.length)}</p>
        )}
      </header>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {alert}
      {loading ? (
        <FavouritesGridSkeleton count={expected} />
      ) : cards ? (
        <Grid ref={gridRef} role="list" columns="products" gap={4} className="gap-y-10">
          {cards.map((item, index) => (
            <FavouriteCard
              key={keyOf(item)}
              item={item}
              priority={index < 2}
              onRemove={() => void remove(item, index)}
            />
          ))}
        </Grid>
      ) : (
        !alert && (
          <EmptyState
            icon={<Heart className="size-5" strokeWidth={1.5} aria-hidden />}
            title="No favourites yet"
            description="Tap Favourite on a product to save it here."
            action={
              <ButtonLink href="/shop" shape="pill">
                Start shopping
              </ButtonLink>
            }
          />
        )
      )}
    </div>
  );
}
