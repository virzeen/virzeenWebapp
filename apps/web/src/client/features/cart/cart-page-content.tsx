"use client";

import { ButtonLink, EmptyState, Separator, Stack } from "@virzeen/ui";
import { ShoppingBag } from "lucide-react";
import { Price } from "@/client/components/shared/price";
import { CartLine } from "./cart-line";
import { useCart } from "./cart-provider";

/** Full bag page: lines on the left, summary on the right (patterns.md §7). */
export function CartPageContent({ notice }: { notice?: string | null }) {
  const { cart } = useCart();

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />}
        title="Your bag is empty."
        description={notice ?? undefined}
        action={
          <ButtonLink href="/shop" shape="pill">
            Browse the collection
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="gap-12 lg:grid-cols-[2fr_1fr] grid">
      <ul className="divide-y divide-line border-y border-line">
        {cart.items.map((line) => (
          <CartLine key={line.id} line={line} />
        ))}
      </ul>
      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-24 lg:self-start">
        <Stack gap={4} className="p-6 rounded-md bg-surface">
          <h2 id="summary-heading" className="font-display text-h3">
            Summary
          </h2>
          <div className="flex justify-between text-body">
            <span>Subtotal</span>
            <span data-testid="cart-subtotal">
              <Price paisa={cart.subtotalPaisa} />
            </span>
          </div>
          <div className="flex justify-between text-body text-ink-muted">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <Separator />
          <p className="text-small text-ink-muted">Prices include 13% VAT.</p>
          <ButtonLink href="/checkout" size="lg" shape="pill" className="w-full">
            Checkout
          </ButtonLink>
          <ButtonLink href="/shop" variant="link" className="self-center">
            Continue shopping
          </ButtonLink>
        </Stack>
      </aside>
    </div>
  );
}
