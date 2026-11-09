"use client";

import { ButtonLink } from "@virzeen/ui";
import { BagIcon } from "@/client/components/shared/header-icons";
import { useCart } from "./cart-provider";

/** Header bag icon with the live item count inside the bag. Opens the bag page, like Nike's. */
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
      data-testid="open-bag"
    >
      <BagIcon count={count} />
    </ButtonLink>
  );
}
