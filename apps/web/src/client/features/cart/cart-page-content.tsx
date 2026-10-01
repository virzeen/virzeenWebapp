"use client";

import { Alert, ButtonLink } from "@virzeen/ui";
import { Fragment, useState } from "react";
import { Price } from "@/client/components/shared/price";
import { BagFavourites, useFavouritesPreview } from "@/client/features/favourites/bag-favourites";
import type { FavouritesPreview } from "@/client/features/favourites/favourite-bag";
import { ProductCarousel } from "@/client/features/products/product-carousel";
import type { ProductCardData } from "@/client/features/products/product-card";
import { CartLine, RemovedLineNotice } from "./cart-line";
import { useCart, type RemovedLine } from "./cart-provider";

type Notice = { tone: "warning" | "info"; text: string };

type CartPageContentProps = {
  notice?: Notice | null;
  /** Signed in: the newest favourites, read on the server; null for a guest (their browser has them). */
  favourites: FavouritesPreview | null;
  /** Products for "You might also like", newest first. */
  suggestions: ProductCardData[];
};

/**
 * The bag page, laid out like Nike's (owner request 2026-09-30, patterns.md §7): "Bag" and the lines on the left,
 * "Summary" on the right from lg. Phones get the count and total under a centred title, and Checkout in a bar fixed
 * to the bottom of the screen. Under them the customer's favourites, or "You might also like" when they have none.
 */
export function CartPageContent({ notice, favourites, suggestions }: CartPageContentProps) {
  const { cart, isOpen } = useCart();
  // The last removed line and where it sat, so "Removed X. Undo" takes its place (and keyboard focus).
  const [removed, setRemoved] = useState<{ line: RemovedLine; index: number } | null>(null);
  // The line Undo just put back, so focus moves to it.
  const [restoredVariantId, setRestoredVariantId] = useState<string | null>(null);
  const isEmpty = cart.items.length === 0;
  const count = `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`;

  const removedNotice = removed && (
    <RemovedLineNotice
      key={`${removed.line.variantId}:${removed.line.quantity}`}
      line={removed.line}
      onUndone={() => {
        setRemoved(null);
        setRestoredVariantId(removed.line.variantId);
      }}
      className="py-6"
    />
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <section aria-labelledby="bag-heading" className="flex flex-col">
          <div className="flex flex-col gap-1 pb-2 text-center lg:text-left">
            <h1 id="bag-heading" className="font-display text-h2">
              Bag
            </h1>
            {!isEmpty && (
              <p className="text-body text-ink-muted lg:hidden">
                {count} | <Price paisa={cart.subtotalPaisa} />
              </p>
            )}
          </div>
          {notice?.tone === "warning" && (
            <Alert variant="warning" className="mt-4">
              {notice.text}
            </Alert>
          )}
          {isEmpty ? (
            <div className="flex flex-col items-center gap-6 pt-6 lg:items-start">
              {removedNotice && <div className="w-full border-y border-line">{removedNotice}</div>}
              <p className="text-body">
                {notice?.tone === "info" ? notice.text : "There are no items in your bag."}
              </p>
              <ButtonLink href="/shop" size="lg" shape="pill">
                Browse the collection
              </ButtonLink>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {cart.items.map((line, index) => (
                <Fragment key={line.id}>
                  {removed?.index === index && <li>{removedNotice}</li>}
                  <CartLine
                    line={line}
                    onRemoved={(removedLine) => setRemoved({ line: removedLine, index })}
                    // Not while the bag drawer covers the page.
                    focusOnMount={!isOpen && line.variantId === restoredVariantId}
                  />
                </Fragment>
              ))}
              {removed && removed.index >= cart.items.length && <li>{removedNotice}</li>}
            </ul>
          )}
        </section>

        {!isEmpty && (
          <aside
            aria-labelledby="summary-heading"
            className="flex flex-col lg:sticky lg:top-24 lg:self-start"
          >
            <h2 id="summary-heading" className="pb-6 font-display text-h2">
              Summary
            </h2>
            <dl className="flex flex-col gap-3 text-body">
              <div className="flex justify-between gap-4">
                <dt>Subtotal</dt>
                <dd data-testid="cart-subtotal">
                  <Price paisa={cart.subtotalPaisa} />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Shipping</dt>
                <dd>Free</dd>
              </div>
              <div className="mt-3 flex justify-between gap-4 border-y border-line py-4 font-medium">
                <dt>Total</dt>
                <dd>
                  <Price paisa={cart.subtotalPaisa} />
                </dd>
              </div>
            </dl>
            {/* Phones: Checkout is in the bar at the bottom of the screen instead. */}
            <ButtonLink href="/checkout" size="lg" shape="pill" className="mt-8 hidden w-full md:inline-flex">
              Checkout
            </ButtonLink>
            <div
              data-sticky-cta
              className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md md:hidden"
            >
              <ButtonLink href="/checkout" size="lg" shape="pill" className="w-full">
                Checkout
              </ButtonLink>
            </div>
          </aside>
        )}
      </div>
      <FavouritesOrSuggestions favourites={favourites} suggestions={suggestions} />
    </div>
  );
}

/**
 * Under the bag (owner request 2026-10-01, like Nike's): "Favourites" when the customer has any, else "You might also
 * like", a carousel of products that aren't in the bag. Nothing while a guest's favourites are still being read.
 */
function FavouritesOrSuggestions({ favourites, suggestions }: Omit<CartPageContentProps, "notice">) {
  const { cart } = useCart();
  const preview = useFavouritesPreview(favourites);
  if (!preview) return null;
  if (preview.items.length > 0) return <BagFavourites preview={preview} />;
  const inBag = new Set(cart.items.map((line) => line.productId));
  return (
    <ProductCarousel
      title="You might also like"
      products={suggestions.filter((product) => !inBag.has(product.id))}
    />
  );
}
