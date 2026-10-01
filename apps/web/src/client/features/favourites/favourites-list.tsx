"use client";

import { Alert, Button, ButtonLink, EmptyState } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FavouriteView } from "@/server/actions/favourites";
import { keepPlaces } from "./favourite-bag";
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
const NONE: ReadonlySet<string> = new Set();

/**
 * The Favourites page body (specs/favourites.md "Nike layout"): the heading (a count for screen readers only), then
 * the saved products, 2 and 3 across, each with a heart on its photo. Pressing a filled heart removes the favourite
 * at once (the provider saves it and fills the heart again if that fails); the card stays, dimmed, with "Removed from
 * favourites" and Undo (or the empty heart) to save it again, and after 5 seconds it fades away (`FavouriteCard`).
 * When the card that goes held keyboard focus, focus moves to the next card's heart, else the previous one's, else
 * the heading. A screen reader hears "Removed {name} from favourites." or "Added {name} to favourites.".
 */
export function FavouritesList({ items, expected, error, onRetry }: FavouritesListProps) {
  const { signedIn, isSaved, isRemoved, save, remove, merging } = useFavourites();
  const router = useRouter();
  const checked = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // Where the card that just went held focus, until the page has drawn without it.
  const refocusAt = useRef<number | null>(null);
  // Hearts pressed on this page (`keyOf`): their cards stay when the list drops them, until they fade away.
  const [pressed, setPressed] = useState(NONE);
  // The cards shown, and the list they were last matched with (React "adjust state when a prop changes" pattern).
  const [shown, setShown] = useState(items);
  const [listed, setListed] = useState(items);
  if (items !== listed) {
    setListed(items);
    setShown(items && shown ? keepPlaces(shown, items, pressed) : items);
  }
  const inList = new Set(items?.map(keyOf));
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

  useLayoutEffect(() => {
    const index = refocusAt.current;
    if (index === null) return;
    refocusAt.current = null;
    const hearts = gridRef.current?.querySelectorAll<HTMLElement>("[data-favourite-heart]");
    (hearts?.item(index) ?? hearts?.item(index - 1) ?? headingRef.current)?.focus();
  });

  // Right after sign-in an empty account list may be about to get the browser's favourites.
  const loading = !error && (shown === null || (merging && shown.length === 0));
  const cards = !loading && shown && shown.length > 0 ? shown : null;

  /** Filled: saved, or listed by the server and not removed here (saved on another device since the layout). */
  const saved = (item: FavouriteView) =>
    isSaved(item.productId, item.color) ||
    (inList.has(keyOf(item)) && !isRemoved(item.productId, item.color));

  async function toggleSaved(item: FavouriteView) {
    const removing = saved(item);
    setPressed((current) => new Set(current).add(keyOf(item)));
    setAnnouncement(
      removing
        ? `Removed ${favouriteName(item)} from favourites.`
        : `Added ${favouriteName(item)} to favourites.`,
    );
    const now = await (removing ? remove : save)(item.productId, item.color);
    // Not saved: the heart is back as it was and a toast says why.
    if (now === null) setAnnouncement("");
  }

  /** The Undo time is over: the card leaves the page (and stays gone when the list comes again). */
  function leave(item: FavouriteView) {
    const key = keyOf(item);
    const index = shown?.findIndex((card) => keyOf(card) === key) ?? -1;
    if (index >= 0 && gridRef.current?.children.item(index)?.contains(document.activeElement)) {
      refocusAt.current = index;
    }
    setShown((current) => current?.filter((card) => keyOf(card) !== key) ?? current);
    setPressed((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function retry() {
    // "Try again" goes away while the list loads, so focus waits on the heading instead of falling to the page.
    headingRef.current?.focus();
    onRetry?.();
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex min-h-11 items-center">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-h1 focus:outline-none">
          Favourites
        </h1>
        {cards && <p className="sr-only">{itemCount(cards.length)}</p>}
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
              saved={saved(item)}
              onToggleSaved={() => void toggleSaved(item)}
              onGone={() => leave(item)}
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
