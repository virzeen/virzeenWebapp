"use client";

import { ButtonLink, EmptyState, Separator, Stack } from "@virzeen/ui";
import { ShoppingBag } from "lucide-react";
import { Fragment, useState } from "react";
import { Price } from "@/client/components/shared/price";
import { CartLine, RemovedLineNotice } from "./cart-line";
import { useCart, type RemovedLine } from "./cart-provider";

/** Full bag page: lines on the left, summary on the right (patterns.md §7). */
export function CartPageContent({ notice }: { notice?: string | null }) {
  const { cart, isOpen } = useCart();
  // The last removed line and where it sat, so "Removed X. Undo" takes its place (and keyboard focus).
  const [removed, setRemoved] = useState<{ line: RemovedLine; index: number } | null>(null);
  // The line Undo just put back, so focus moves to it.
  const [restoredVariantId, setRestoredVariantId] = useState<string | null>(null);

  const removedNotice = removed && (
    <RemovedLineNotice
      key={`${removed.line.variantId}:${removed.line.quantity}`}
      line={removed.line}
      onUndone={() => {
        setRemoved(null);
        setRestoredVariantId(removed.line.variantId);
      }}
      className="py-4"
    />
  );

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {removedNotice && <div className="border-y border-line">{removedNotice}</div>}
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
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr]">
      <ul className="divide-y divide-line border-y border-line">
        {cart.items.map((line, index) => (
          <Fragment key={line.id}>
            {removed?.index === index && <li>{removedNotice}</li>}
            <CartLine
              line={line}
              onRemoved={(removedLine) => setRemoved({ line: removedLine, index })}
              // Not while the drawer covers the page: an Undo there focuses the drawer's own line.
              focusOnMount={!isOpen && line.variantId === restoredVariantId}
            />
          </Fragment>
        ))}
        {removed && removed.index >= cart.items.length && <li>{removedNotice}</li>}
      </ul>
      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-24 lg:self-start">
        <Stack gap={4} className="rounded-md bg-surface p-6">
          <h2 id="summary-heading" className="font-display text-h3">
            Summary
          </h2>
          <div className="flex justify-between text-body">
            <span>Subtotal</span>
            <span data-testid="cart-subtotal">
              <Price paisa={cart.subtotalPaisa} />
            </span>
          </div>
          <div className="flex justify-between text-body">
            <span>Shipping</span>
            <span>Free</span>
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
