"use client";

import { Alert, Button, ButtonLink, EmptyState } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FavouriteView } from "@/server/actions/favourites";
import { FavouriteCard, favouriteName } from "./favourite-card";
import { FavouritesGrid } from "./favourites-grid";
import { useFavourites } from "./favourites-provider";
import { FavouritesGridSkeleton } from "./favourites-skeleton";
import { keyOf } from "./favourites-store";

type FavouritesListProps = {
  /** Newest first; null while a guest's list is still loading. */
  items: FavouriteView[] | null;
  /** How many cards are on their way, for the skeleton. */
  expected?: number;
  /** Why a guest's list didn't load; shown with "Try again", which calls onRetry. */
  error?: string | null;
  onRetry?: () => void;
};

const itemCount = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

/**
 * The Favourites page body (specs/favourites.md "Nike layout"): the heading with "Edit" on the right (a count for
 * screen readers only), then the saved products, 2 and 3 across. "Edit" (then "Done", `aria-pressed`) puts a round
 * Remove on each photo, and only shows when there's something to remove. Remove takes a card away at once (the
 * provider saves it and puts it back if that fails); keyboard focus then moves to the next card's Remove, else the
 * previous one's, else "Done", and a screen reader hears "Removed {name}.". Edit mode ends with the page.
 */
export function FavouritesList({ items, expected, error, onRetry }: FavouritesListProps) {
  const { signedIn, isSaved, isRemoved, remove: removeFavourite, merging } = useFavourites();
  const router = useRouter();
  const checked = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  // The card just removed and where it was, until it has left the page.
  const removing = useRef<{ key: string; index: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Signed in, which favourites are saved comes from the site layout, which moving here from another page doesn't
  // render again. A favourite saved since on another device or tab is on this page but not in that list yet: the
  // page shows it anyway, and once, when the page arrives, the layout is fetched again (the header and every
  // Favourite button then know it too).
  useEffect(() => {
    if (checked.current || !items) return;
    checked.current = true;
    const unknown = (item: FavouriteView) =>
      !isSaved(item.productId, item.color) && !isRemoved(item.productId, item.color);
    if (signedIn && items.some(unknown)) router.refresh();
  }, [items, signedIn, isSaved, isRemoved, router]);

  // A removed card goes at once (it comes back if that fails); a guest's list also follows their other tabs.
  const visible = items?.filter((item) => !isRemoved(item.productId, item.color)) ?? null;
  // Right after sign-in an empty account list may be about to get the browser's favourites.
  const loading = !error && (visible === null || (merging && visible.length === 0));
  const cards = !loading && visible && visible.length > 0 ? visible : null;
  // After the last Remove, "Done" stays (holding focus) until it's pressed.
  const showEdit = !loading && (cards !== null || editing);

  useLayoutEffect(() => {
    const pending = removing.current;
    if (!pending || visible?.some((item) => keyOf(item) === pending.key)) return;
    removing.current = null;
    const buttons = gridRef.current?.querySelectorAll<HTMLElement>("[data-remove-favourite]");
    (buttons?.item(pending.index) ?? buttons?.item(pending.index - 1) ?? editRef.current)?.focus();
  });

  async function remove(item: FavouriteView, index: number) {
    removing.current = { key: keyOf(item), index };
    setAnnouncement(`Removed ${favouriteName(item)}.`);
    if ((await removeFavourite(item.productId, item.color)) !== null) return;
    // Not saved: the card is back and a toast says why.
    removing.current = null;
    setAnnouncement("");
  }

  function toggleEditing() {
    // "Done" with nothing left goes away, so focus waits on the heading.
    if (editing && !cards) headingRef.current?.focus();
    setEditing(!editing);
  }

  function retry() {
    // "Try again" goes away while the list loads, so focus waits on the heading instead of falling to the page.
    headingRef.current?.focus();
    onRetry?.();
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex min-h-11 items-center justify-between gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-h1 focus:outline-none">
          Favourites
        </h1>
        {cards && <p className="sr-only">{itemCount(cards.length)}</p>}
        {showEdit && (
          <Button ref={editRef} variant="link" aria-pressed={editing} onClick={toggleEditing}>
            {editing ? "Done" : "Edit"}
          </Button>
        )}
      </header>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {error && (
        <Alert variant="danger" action={<Button onClick={retry}>Try again</Button>}>
          {error}
        </Alert>
      )}
      {loading ? (
        <FavouritesGridSkeleton count={expected} />
      ) : cards ? (
        <FavouritesGrid ref={gridRef} role="list">
          {cards.map((item, index) => (
            <FavouriteCard
              key={keyOf(item)}
              item={item}
              priority={index < 2}
              editing={editing}
              onRemove={() => void remove(item, index)}
            />
          ))}
        </FavouritesGrid>
      ) : (
        !error && (
          <EmptyState
            icon={<Heart className="size-5" strokeWidth={1.5} aria-hidden />}
            title="Items added to your Favourites will be saved here."
            action={
              <ButtonLink href="/shop" shape="pill">
                Shop
              </ButtonLink>
            }
          />
        )
      )}
    </div>
  );
}
