"use client";

import { Button, cn, Link } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import type { FavouriteView } from "@/server/actions/favourites";
import { favouriteDetails, favouriteHref } from "./favourite-bag";
import { FavouriteBagButton } from "./favourite-bag-button";

/**
 * The product and the saved style, "Linen Overshirt, Black" (just the name without styles, or when the style isn't
 * sold any more).
 */
export const favouriteName = ({ product, style }: FavouriteView) =>
  style ? `${product.name}, ${style}` : product.name;

/** How long a removed card stays (dimmed) before it fades away, and how long the fade takes. */
const UNDO_MS = 5000;
const FADE_MS = 400;
/** How long "Removed from favourites — Undo" shows (owner, 2026-10-01: 2 seconds), and its slide back down. */
const BAR_MS = 2000;
const BAR_OUT_MS = 250;

type FavouriteCardProps = {
  item: FavouriteView;
  priority?: boolean;
  /** The heart is filled. Empty: removed with a press here, so the card offers Undo until it goes. */
  saved: boolean;
  /** The heart, and Undo: removes the favourite, or saves it again. */
  onToggleSaved: () => void;
  /** The card has faded away after its Undo time: take it off the page. */
  onGone: () => void;
};

/**
 * A saved product, Nike's way (specs/favourites.md "Nike layout"): one link to the product in the saved style (the
 * square photo; the name with "Category · Style" in grey under it on the left and the price on the right), then the
 * bag pill. On phones the price goes under them: beside them, a half-width column left no room for a word like
 * "Heavyweight". A button can't sit inside a link, so the heart lies over the photo's top right beside it. A style
 * that isn't sold any more shows the product's usual photo and price, with just the category.
 *
 * Removed with the heart, the card dims and a dark bar slides up inside the photo: "Removed from favourites" with Undo.
 * The bar slides back down after 2 seconds (the empty heart still saves it again); 5 seconds after the press the card
 * fades away and `onGone` takes it off the page. While a keyboard user's focus is inside the card both clocks wait, so
 * there's time to reach Undo (WCAG 2.2.1); they start again when focus leaves.
 */
export function FavouriteCard({ item, priority = false, saved, onToggleSaved, onGone }: FavouriteCardProps) {
  const { product } = item;
  const removed = !saved;
  // A keyboard user's focus is inside the card.
  const [held, setHeld] = useState(false);
  const fading = useFadeAway(removed && !held, onGone);

  return (
    <div
      role="listitem"
      className={cn(
        "relative flex flex-col gap-4 transition-opacity duration-400 ease-standard",
        fading && "opacity-0",
      )}
      onFocus={(event) => setHeld(event.target.matches(":focus-visible"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
      }}
    >
      <Link
        href={favouriteHref(item)}
        variant="subtle"
        className={cn(
          "group flex flex-col gap-3 text-ink transition-opacity duration-150 ease-standard hover:text-ink",
          removed && "opacity-50",
        )}
      >
        <CloudImage
          src={product.imageUrl}
          alt={product.imageAlt}
          ratio="square"
          sizes="(min-width: 768px) 33vw, 50vw"
          priority={priority}
          imageClassName="transition-transform duration-400 ease-standard motion-safe:group-hover:scale-102"
        />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {/* A word longer than the space left for it breaks instead of pushing the price out of the card. */}
            <span className="text-body font-medium wrap-break-word">{product.name}</span>
            <span className="text-body wrap-break-word text-ink-muted">{favouriteDetails(item)}</span>
          </div>
          <Price paisa={product.fromPricePaisa} className="shrink-0 text-body font-medium" />
        </div>
      </Link>
      <Button
        variant="inverse"
        size="icon"
        shape="pill"
        className="absolute top-3 right-3"
        aria-label={`Favourite ${favouriteName(item)}`}
        aria-pressed={saved}
        data-favourite-heart
        onClick={onToggleSaved}
      >
        <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.5} aria-hidden />
      </Button>
      {removed && <UndoBar running={!held} onUndo={onToggleSaved} />}
      <div>
        <FavouriteBagButton item={item} />
      </div>
    </div>
  );
}

/**
 * "Removed from favourites" with Undo, sliding up inside the photo's bottom edge (the wrapper is as tall as the photo
 * and clips it). After BAR_MS of `running` it slides back down and goes; it mounts afresh with each removal.
 */
function UndoBar({ running, onUndo }: { running: boolean; onUndo: () => void }) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    if (!running || phase !== "in") return;
    const out = window.setTimeout(() => setPhase("out"), BAR_MS);
    return () => window.clearTimeout(out);
  }, [running, phase]);

  // The slide down ends it (animationend); without motion there's no animation, so a timer ends it too.
  useEffect(() => {
    if (phase !== "out") return;
    const gone = window.setTimeout(() => setPhase("gone"), BAR_OUT_MS + 50);
    return () => window.clearTimeout(gone);
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-square items-end overflow-hidden p-3">
      <div
        className={cn(
          "pointer-events-auto flex w-full flex-wrap items-center justify-center gap-x-4 rounded-sm bg-canvas px-4 py-1 text-center tone-inverse",
          phase === "in" ? "motion-safe:animate-slide-in-bottom" : "motion-safe:animate-slide-out-bottom",
        )}
        onAnimationEnd={() => {
          if (phase === "out") setPhase("gone");
        }}
      >
        <p className="text-small font-medium">Removed from favourites</p>
        <Button variant="underline" size="sm" onClick={onUndo}>
          Undo
        </Button>
      </div>
    </div>
  );
}

/**
 * While `running`: after UNDO_MS the card starts fading (true), and FADE_MS later `onGone` runs. Stopping (Undo, or
 * a keyboard user's focus coming in) cancels both and shows the card again; running again starts from the beginning.
 */
function useFadeAway(running: boolean, onGone: () => void) {
  const [fading, setFading] = useState(false);
  const goneRef = useRef(onGone);
  useEffect(() => {
    goneRef.current = onGone;
  });
  // Stopped mid-fade: visible again (React "adjust state when a prop changes" pattern).
  if (!running && fading) setFading(false);

  useEffect(() => {
    if (!running) return;
    const fade = window.setTimeout(() => setFading(true), UNDO_MS);
    const gone = window.setTimeout(() => goneRef.current(), UNDO_MS + FADE_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
    };
  }, [running]);

  return running && fading;
}
