"use client";

import { Button, cn, toast } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useRef } from "react";
import { useShowAddedFavourite, type AddedFavourite } from "./added-to-favourites";
import { useFavourites } from "./favourites-provider";

type FavouriteButtonProps = {
  productId: string;
  /** The picked style (variant colour); "" for a product without styles. */
  color: string;
  /** What "Added to favourites" shows after a save: the product in the picked style. */
  summary: AddedFavourite;
  /** Admin preview: only says nothing was saved. */
  preview?: boolean;
};

/**
 * "Favourite" under Add to bag (specs/favourites.md): saves the product in the style picked now, and "Added to
 * favourites" drops down under the header (focus comes back here when it closes). Removing says so in a toast.
 */
export function FavouriteButton({ productId, color, summary, preview = false }: FavouriteButtonProps) {
  const { isSaved, toggle } = useFavourites();
  const showAdded = useShowAddedFavourite();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const saved = !preview && isSaved(productId, color);

  async function press() {
    if (preview) {
      toast.message("This is a preview. Nothing was saved.");
      return;
    }
    const now = await toggle(productId, color);
    if (now === true) {
      showAdded(summary, buttonRef.current);
    } else if (now === false) {
      toast.message("Removed from favourites");
    }
  }

  return (
    <Button
      ref={buttonRef}
      variant="secondary"
      size="lg"
      shape="pill"
      className="w-full"
      aria-pressed={saved}
      onClick={() => void press()}
    >
      <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.5} aria-hidden />
      {saved ? "Favourited" : "Favourite"}
    </Button>
  );
}
