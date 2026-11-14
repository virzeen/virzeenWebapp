"use client";

import { Button, cn, toast } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { useRef } from "react";
import type { ProductCardData } from "@/client/features/products/product-card";
import { useShowAddedFavourite } from "./added-to-favourites";
import { favouriteDetails } from "./favourite-bag";
import { useFavourites } from "./favourites-provider";

/**
 * The round heart in the top right corner of a card in a carousel (owner 2026-11-14: "one favourite icon in the top
 * right corner in the circle, so it's easy to add to favourites"), laid over the photo like the Favourites page's. A
 * button can't sit inside the card's link, so the carousel puts this beside it in a `relative` box. It saves the
 * product in its first style (the style the card shows; "" for a product without styles), opens "Added to favourites"
 * like the Favourite button on the product page, and says so in a toast when it removes it again. Inside
 * `FavouritesProvider`, so not for the admin editor's preview.
 */
export function ProductCardHeart({ product }: { product: ProductCardData }) {
  const { isSaved, toggle } = useFavourites();
  const showAdded = useShowAddedFavourite();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const style = product.styles[0] ?? "";
  const saved = isSaved(product.id, style);

  async function press() {
    const now = await toggle(product.id, style);
    if (now === true) {
      showAdded(
        {
          name: product.name,
          details: favouriteDetails({ category: product.categoryName, style }),
          imageUrl: product.imageUrl,
          imageAlt: product.imageAlt,
          pricePaisa: product.fromPricePaisa,
        },
        buttonRef.current,
      );
    } else if (now === false) {
      toast.message("Removed from favourites");
    }
  }

  return (
    <Button
      ref={buttonRef}
      variant="inverse"
      size="icon"
      shape="pill"
      className="absolute top-3 right-3"
      aria-label={`Favourite ${product.name}`}
      aria-pressed={saved}
      data-testid="card-heart"
      onClick={() => void press()}
    >
      <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.5} aria-hidden />
    </Button>
  );
}
