"use client";

import { Button, ButtonLink, toast } from "@virzeen/ui";
import { useRef } from "react";
import type { FavouriteView } from "@/server/actions/favourites";
import { bagChoice, favouriteHref } from "./favourite-bag";
import { SelectSizeDialog } from "./select-size-dialog";
import { useAddToBag } from "./use-add-to-bag";

/**
 * The outlined pill across a favourite's card (specs/favourites.md "Nike layout"): "Add to bag" for a style with one
 * variant, "Select size" (a popup) for one with sizes, "Sold out" (disabled) when none is in stock, and "View product"
 * (a link to the product page) when the saved style isn't sold any more but another style is in stock.
 */
export function FavouriteBagButton({ item }: { item: FavouriteView }) {
  const choice = bagChoice(item);
  switch (choice.kind) {
    case "size":
      return <SelectSizeDialog productName={item.product.name} sizes={choice.sizes} />;
    case "add":
      return <AddToBagButton variant={choice.variant} />;
    case "view":
      return (
        <ButtonLink href={favouriteHref(item)} variant="secondary" shape="pill" className="w-full">
          View product
        </ButtonLink>
      );
    default:
      return (
        <Button variant="secondary" shape="pill" className="w-full" disabled>
          Sold out
        </Button>
      );
  }
}

/**
 * Adds the one variant; the bag opens and sends focus back here when it closes. Errors are a toast, as on the product
 * page; so is "The last one is already in your bag." (the product page has room for it under its button).
 */
function AddToBagButton({ variant }: { variant: FavouriteView["variants"][number] }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { add, pending } = useAddToBag();
  return (
    <Button
      ref={buttonRef}
      variant="secondary"
      shape="pill"
      className="w-full"
      loading={pending}
      onClick={() =>
        add(variant, { returnFocusTo: buttonRef.current, onError: (message) => toast.error(message) })
      }
    >
      Add to bag
    </Button>
  );
}
