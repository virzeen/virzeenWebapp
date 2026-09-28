// apps/web/src/client/features/cart/add-to-bag-button.tsx
"use client";

import { useTransition } from "react";
import { Button, toast } from "@virzeen/ui";
import { addToCartAction } from "@/server/actions/cart"; // Server Actions are the only server import allowed in client code
import { messageFor } from "@/client/lib/error-messages"; // maps error codes → content-style.md copy
import { useCartDrawer } from "@/client/features/cart/use-cart-drawer";

type Props = {
  variantId: string | null; // null until the customer picks a size
  inStock: boolean;
};

export function AddToBagButton({ variantId, inStock }: Props) {
  const [isPending, startTransition] = useTransition();
  const { open: openCartDrawer } = useCartDrawer();

  function handleClick() {
    if (!variantId) return;
    startTransition(async () => {
      const result = await addToCartAction({ variantId, quantity: 1 });
      if (result.ok) {
        toast.success("Added to bag");
        openCartDrawer();
      } else {
        toast.error(messageFor(result.error.code));
      }
    });
  }

  return (
    <Button
      size="lg"
      className="w-full"
      loading={isPending}
      disabled={!variantId || !inStock}
      onClick={handleClick}
      data-testid="add-to-bag"
    >
      {!inStock ? "Out of stock" : variantId ? "Add to bag" : "Select a size"}
    </Button>
  );
}
