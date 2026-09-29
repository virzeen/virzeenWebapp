"use client";

import { ButtonLink, EmptyState, Sheet, SheetContent, Stack } from "@virzeen/ui";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Price } from "@/client/components/shared/price";
import { CartLine, RemovedLineNotice } from "./cart-line";
import { useCart } from "./cart-provider";

/** Right-side bag drawer (patterns.md §7). Opens after add-to-bag and from the header. */
export function CartDrawer() {
  const { cart, isOpen, setOpen, returnFocusRef, justAdded, lastRemoved, setLastRemoved } = useCart();
  // The line Undo just put back, so focus can land on it instead of falling back to the drawer.
  const [restoredVariantId, setRestoredVariantId] = useState<string | null>(null);
  if (!isOpen && restoredVariantId) setRestoredVariantId(null);
  const isEmpty = cart.items.length === 0;
  const count = `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        title="Bag"
        // Right after an add the open drawer is the confirmation, so it says so (no toast over it).
        description={isEmpty ? undefined : justAdded ? `Added to bag · ${count}` : count}
        // The drawer has no SheetTrigger: send focus back to whatever opened it.
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef.current;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        }}
        footer={
          isEmpty ? undefined : (
            <Stack gap={4}>
              <div className="flex items-baseline justify-between">
                <span className="text-body">Subtotal</span>
                <span data-testid="cart-subtotal">
                  <Price paisa={cart.subtotalPaisa} className="text-h3" />
                </span>
              </div>
              <p className="text-small text-ink-muted">Free shipping across Nepal. Prices include VAT.</p>
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
        {/* The drawer is modal, so a toast's Undo button can't be reached: Undo sits here instead. */}
        <div role="status">
          {lastRemoved && (
            <RemovedLineNotice
              key={`${lastRemoved.variantId}:${lastRemoved.quantity}`}
              line={lastRemoved}
              onUndone={() => {
                setLastRemoved(null);
                setRestoredVariantId(lastRemoved.variantId);
              }}
              className="border-b border-line pb-4"
            />
          )}
        </div>
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
              <CartLine
                key={line.id}
                line={line}
                onRemoved={setLastRemoved}
                focusOnMount={line.variantId === restoredVariantId}
              />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
