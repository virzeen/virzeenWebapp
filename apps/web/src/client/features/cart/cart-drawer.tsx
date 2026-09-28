"use client";

import { Button, ButtonLink, EmptyState, Sheet, SheetContent, Stack } from "@virzeen/ui";
import { ShoppingBag } from "lucide-react";
import { useState, useTransition } from "react";
import { Price } from "@/client/components/shared/price";
import { messageFor } from "@/client/lib/error-messages";
import { undoRemoveAction } from "@/server/actions/cart";
import { CartLine } from "./cart-line";
import { useCart, type RemovedLine } from "./cart-provider";

/** Right-side bag drawer (patterns.md §7). Opens after add-to-bag and from the header. */
export function CartDrawer() {
  const { cart, isOpen, setOpen } = useCart();
  const isEmpty = cart.items.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        title="Bag"
        description={isEmpty ? undefined : `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`}
        footer={
          isEmpty ? undefined : (
            <Stack gap={4}>
              <div className="flex items-baseline justify-between">
                <span className="text-body">Subtotal</span>
                <span data-testid="cart-subtotal">
                  <Price paisa={cart.subtotalPaisa} className="text-h3" />
                </span>
              </div>
              <p className="text-small text-ink-muted">
                Shipping calculated at checkout. Prices include VAT.
              </p>
              <ButtonLink
                href="/checkout"
                size="lg"
                shape="pill"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Checkout
              </ButtonLink>
              <ButtonLink
                href="/cart"
                variant="secondary"
                size="lg"
                shape="pill"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                View bag
              </ButtonLink>
            </Stack>
          )
        }
      >
        <RemovedNotice />
        {isEmpty ? (
          <EmptyState
            icon={<ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />}
            title="Your bag is empty."
            action={
              <ButtonLink href="/shop" shape="pill" onClick={() => setOpen(false)}>
                Browse the collection
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {cart.items.map((line) => (
              <CartLine key={line.id} line={line} compact />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** "Removed X. Undo" inside the drawer: the drawer is modal, so a toast's Undo button can't be reached. */
function RemovedNotice() {
  const { lastRemoved } = useCart();
  return (
    <div role="status">
      {lastRemoved && <UndoRow key={`${lastRemoved.variantId}:${lastRemoved.quantity}`} line={lastRemoved} />}
    </div>
  );
}

function UndoRow({ line }: { line: RemovedLine }) {
  const { setLastRemoved, setCart } = useCart();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function undo() {
    startTransition(async () => {
      const result = await undoRemoveAction({ variantId: line.variantId, quantity: line.quantity });
      if (!result.ok) return setError(messageFor(result.error));
      setCart(result.data);
      setLastRemoved(null);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
      <p className="text-small text-ink-muted">{error ?? `Removed ${line.productName}.`}</p>
      <Button variant="link" size="sm" onClick={undo} disabled={isPending}>
        Undo
      </Button>
    </div>
  );
}
