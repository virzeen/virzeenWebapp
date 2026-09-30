"use client";

import { ButtonLink } from "@virzeen/ui";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";

/** Header bag icon with the live item count. Opens the bag page, like Nike's. */
export function BagButton() {
  const { cart } = useCart();
  const count = cart.itemCount;
  return (
    <ButtonLink
      href="/cart"
      variant="ghost"
      size="icon"
      shape="pill"
      aria-label={count > 0 ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag"}
      className="relative"
      data-testid="open-bag"
    >
      <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />
      {count > 0 && (
        <span
          className="absolute top-1.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-caption text-canvas tabular-nums"
          aria-hidden
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </ButtonLink>
  );
}
