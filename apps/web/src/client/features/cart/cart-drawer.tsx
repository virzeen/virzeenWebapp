"use client";

import { ButtonLink, EmptyState, Sheet, SheetContent, Stack } from "@virzeen/ui";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Price } from "@/client/components/shared/price";
import { CartLine, RemovedLineNotice } from "./cart-line";
import { useCart, type RemovedLine } from "./cart-provider";

/**
 * The bag drawer, sliding in from the right after an add (patterns.md §7; brought back on 2026-10-01 in place of the
 * "Added to bag" drop-down, owner's choice). It says "Added to bag · N items" and lists the lines, as the bag page
 * does (quantity pill with the bin at 1, heart); the footer holds the subtotal, Checkout and View bag.
 */
export function CartDrawer() {
  const { cart, isOpen, setOpen, returnFocusRef, justAdded } = useCart();
  // The last removed line: "Removed X. Undo" sits at the top (a toast's Undo can't be reached behind the modal).
  const [removed, setRemoved] = useState<RemovedLine | null>(null);
  // The line Undo just put back, so focus lands on it instead of falling back to the drawer.
  const [restoredVariantId, setRestoredVariantId] = useState<string | null>(null);
  // Each opening starts without the last visit's notice (React "adjust state when a prop changes" pattern).
  if (!isOpen && (removed || restoredVariantId)) {
    setRemoved(null);
    setRestoredVariantId(null);
  }
  const isEmpty = cart.items.length === 0;
  const count = `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`;
  const close = () => setOpen(false);

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
              <ButtonLink href="/checkout" size="lg" shape="pill" className="w-full" onClick={close}>
                Checkout
              </ButtonLink>
              <ButtonLink
                href="/cart"
                variant="secondary"
                size="lg"
                shape="pill"
                className="w-full"
                onClick={close}
              >
                View bag
              </ButtonLink>
            </Stack>
          )
        }
      >
        <div role="status">
          {removed && (
            <RemovedLineNotice
              key={`${removed.variantId}:${removed.quantity}`}
              line={removed}
              onUndone={() => {
                setRemoved(null);
                setRestoredVariantId(removed.variantId);
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
              <ButtonLink href="/shop" shape="pill" onClick={close}>
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
                inDrawer
                onRemoved={setRemoved}
                focusOnMount={line.variantId === restoredVariantId}
              />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
