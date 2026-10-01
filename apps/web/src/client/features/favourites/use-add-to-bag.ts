"use client";

import { MAX_QTY_PER_LINE } from "@virzeen/validators";
import { useTransition } from "react";
import { useCart } from "@/client/features/cart/cart-provider";
import { addToBagMessage, allInBagMessage } from "@/client/lib/error-messages";
import { addToCartAction } from "@/server/actions/cart";
import { OFFLINE } from "./use-account-favourites";

type AddOptions = {
  /** Where focus goes back to when the bag drawer closes. */
  returnFocusTo: HTMLElement | null;
  /** Called just before the bag opens (the size popup closes itself here). */
  onAdded?: () => void;
  /**
   * Why nothing was added: "The last one is already in your bag." (checked here, before the server) or the server's
   * error (addToBagMessage), e.g. "Only 2 left".
   */
  onError: (message: string) => void;
};

/**
 * One piece of a variant into the bag, the product page's way (product-purchase.tsx): when the bag already holds
 * every piece left (or the per-line limit) it says so without asking the server, else addToCartAction, then the bag
 * takes the new cart and opens, its description saying "Added to bag" (no toast). `pending` while it runs.
 */
export function useAddToBag() {
  const { cart, setCart, open } = useCart();
  const [pending, startTransition] = useTransition();

  function add(variant: { id: string; stock: number }, { returnFocusTo, onAdded, onError }: AddOptions) {
    const limit = Math.min(variant.stock, MAX_QTY_PER_LINE);
    const inBag = cart.items.find((item) => item.variantId === variant.id)?.quantity ?? 0;
    // The server would refuse with "Only N left", which reads like the stock label: say what's going on instead.
    if (inBag >= limit) return onError(allInBagMessage(limit));
    startTransition(async () => {
      const result = await addToCartAction({ variantId: variant.id, quantity: 1 }).catch(() => OFFLINE);
      if (result.ok) {
        onAdded?.();
        setCart(result.data);
        open({ returnFocusTo, added: true });
      } else {
        onError(addToBagMessage(result.error));
      }
    });
  }

  return { add, pending };
}
