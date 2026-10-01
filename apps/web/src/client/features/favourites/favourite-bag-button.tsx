"use client";

import { Button, ButtonLink, toast } from "@virzeen/ui";
import { useRef } from "react";
import { useCart } from "@/client/features/cart/cart-provider";
import type { FavouriteView } from "@/server/actions/favourites";
import { AddToBagDialog } from "./add-to-bag-dialog";
import { BagPillLabel } from "./bag-pill-label";
import { bagChoice, favouriteHref, styleInBag } from "./favourite-bag";
import { useAddToBag } from "./use-add-to-bag";

/**
 * The outlined pill on a favourite's card (specs/favourites.md "Nike layout"): "Add to bag", which adds a style's one
 * variant or opens the Add to bag popup for one with sizes, and says "Added" (green tick) once the bag holds the
 * style; "Sold out" (disabled) when none is in stock; "View product" (a link to the product page) when the saved
 * style isn't sold any more but another style is in stock.
 */
export function FavouriteBagButton({ item }: { item: FavouriteView }) {
  const { cart } = useCart();
  const choice = bagChoice(item);
  const added = styleInBag(item.variants, cart.items);
  switch (choice.kind) {
    case "size":
      return <AddToBagDialog item={item} sizes={choice.sizes} added={added} />;
    case "add":
      return <AddToBagButton variant={choice.variant} added={added} />;
    case "view":
      return (
        <ButtonLink href={favouriteHref(item)} variant="secondary" size="lg" shape="pill">
          View product
        </ButtonLink>
      );
    default:
      return (
        <Button variant="secondary" size="lg" shape="pill" disabled>
          Sold out
        </Button>
      );
  }
}

/**
 * Adds the one variant; the bag drawer opens and sends focus back here when it closes. Errors are a toast,
 * as on the product page; so is "The last one is already in your bag." (the product page has room for it under its
 * button).
 */
function AddToBagButton({ variant, added }: { variant: FavouriteView["variants"][number]; added: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { add, pending } = useAddToBag();
  return (
    <Button
      ref={buttonRef}
      variant="secondary"
      size="lg"
      shape="pill"
      loading={pending}
      onClick={() =>
        add(variant, { returnFocusTo: buttonRef.current, onError: (message) => toast.error(message) })
      }
    >
      <BagPillLabel added={added} />
    </Button>
  );
}
