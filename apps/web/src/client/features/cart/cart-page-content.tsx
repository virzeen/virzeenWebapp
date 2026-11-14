"use client";

import { Alert, Button, ButtonLink, Link } from "@virzeen/ui";
import { ChevronRight, PackageCheck, Ticket } from "lucide-react";
import {
  deliveryFeeFor,
  memberDeliverySaving,
  passDiscountFor,
  remainingForFreeDelivery,
} from "@virzeen/validators/limits";
import { Fragment, useState } from "react";
import { Price, ShippingPrice } from "@/client/components/shared/price";
import { BagFavourites, useFavouritesPreview } from "@/client/features/favourites/bag-favourites";
import type { FavouritesPreview } from "@/client/features/favourites/favourite-bag";
import { ProductCarousel } from "@/client/features/products/product-carousel";
import type { ProductCardData } from "@/client/features/products/product-card";
import { storePromo, useStoredPromo } from "@/client/features/checkout/promo-storage";
import { CartLine, RemovedLineNotice } from "./cart-line";
import { useCart, type RemovedLine } from "./cart-provider";
import { PromoCodeDialog } from "./promo-code-dialog";

type Notice = { tone: "warning" | "info"; text: string };

type CartPageContentProps = {
  notice?: Notice | null;
  /** Signed in: the newest favourites, read on the server; null for a guest (their browser has them). */
  favourites: FavouritesPreview | null;
  /** Products for "You might also like", newest first. */
  suggestions: ProductCardData[];
  /** Who is looking (decides the delivery rate) and the arrival estimate worked out on the server. */
  delivery: { tier: "GUEST" | "MEMBER" | "PASS"; arrivesBy: string };
};

/**
 * The bag page, laid out like Nike's (owner request 2026-09-30, patterns.md §7): "Bag" and the lines on the left,
 * "Summary" on the right from lg. Phones get the count and total under a centred title, and Checkout in a bar fixed
 * to the bottom of the screen. Under them the customer's favourites, or "You might also like" when they have none.
 */
export function CartPageContent({ notice, favourites, suggestions, delivery }: CartPageContentProps) {
  const { cart, isOpen } = useCart();
  // The last removed line and where it sat, so "Removed X. Undo" takes its place (and keyboard focus).
  const [removed, setRemoved] = useState<{ line: RemovedLine; index: number } | null>(null);
  // The line Undo just put back, so focus moves to it.
  const [restoredVariantId, setRestoredVariantId] = useState<string | null>(null);
  const isEmpty = cart.items.length === 0;
  const count = `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`;
  // Display only: checkout works the totals out again on the server (docs/specs/checkout-v2-week1.md).
  const deliveryPaisa = deliveryFeeFor(delivery.tier, cart.subtotalPaisa);
  const toFreeDelivery = remainingForFreeDelivery(delivery.tier, cart.subtotalPaisa);
  const memberSaving = delivery.tier === "GUEST" ? memberDeliverySaving(cart.subtotalPaisa) : 0;
  // A Pass member's 10% (a promo code replaces it at checkout).
  const passDiscountPaisa = delivery.tier === "PASS" ? passDiscountFor(cart.subtotalPaisa) : 0;
  const isGuest = delivery.tier === "GUEST";

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
    // The bag keeps its narrower column; the product row under it is as wide as the shop (owner 2026-11-08).
    <div className="flex flex-col gap-16">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
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
          {!isEmpty && <FreeReturns />}
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
                <dt>Delivery</dt>
                <dd data-testid="cart-delivery">
                  <ShippingPrice paisa={deliveryPaisa} />
                </dd>
              </div>
              {passDiscountPaisa > 0 && (
                <div className="flex justify-between gap-4">
                  <dt>Pass discount</dt>
                  <dd data-testid="cart-pass-discount">
                    −<Price paisa={passDiscountPaisa} />
                  </dd>
                </div>
              )}
              <div className="mt-3 flex justify-between gap-4 border-y border-line py-4 font-medium">
                <dt>Total</dt>
                <dd data-testid="cart-total">
                  <Price paisa={cart.subtotalPaisa - passDiscountPaisa + deliveryPaisa} />
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-col gap-2 text-small text-ink-muted">
              {toFreeDelivery > 0 && (
                <p data-testid="cart-free-delivery-hint">
                  Add <Price paisa={toFreeDelivery} /> more for free delivery.
                </p>
              )}
              {memberSaving > 0 && (
                <p data-testid="cart-member-line">
                  MONO Members save <Price paisa={memberSaving} /> on this order.
                </p>
              )}
              <p className="text-ink" data-testid="cart-arrives-by">
                Arrives by {delivery.arrivesBy}
              </p>
            </div>
            <PromoRow isGuest={isGuest} />
            {/* Phones: the checkout buttons are in the bar at the bottom of the screen instead. */}
            <div className="mt-8 hidden flex-col gap-3 md:flex">
              <CheckoutButtons isGuest={isGuest} />
            </div>
            <div
              data-sticky-cta
              className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 pt-3 pb-safe-bar backdrop-blur-md md:hidden"
            >
              <div className={isGuest ? "grid grid-cols-2 gap-3" : "flex flex-col"}>
                <CheckoutButtons isGuest={isGuest} />
              </div>
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
function FavouritesOrSuggestions({
  favourites,
  suggestions,
}: Omit<CartPageContentProps, "notice" | "delivery">) {
  const { cart } = useCart();
  const preview = useFavouritesPreview(favourites);
  // A guest sees the invitation (owner request 2026-11-11, like Nike's): favourites are for signed-in customers here.
  if (favourites === null) return <GuestFavouritesPrompt />;
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

/** The bag's buttons: a guest chooses how to check out right here, a member just checks out. */
function CheckoutButtons({ isGuest }: { isGuest: boolean }) {
  if (!isGuest) {
    return (
      <ButtonLink href="/checkout" size="lg" shape="pill" className="w-full">
        Checkout
      </ButtonLink>
    );
  }
  return (
    <>
      <ButtonLink
        href="/checkout?as=guest"
        size="lg"
        shape="pill"
        className="w-full"
        data-testid="bag-guest-checkout"
      >
        Guest Checkout
      </ButtonLink>
      <ButtonLink
        href="/login?next=%2Fcheckout"
        size="lg"
        shape="pill"
        className="w-full"
        data-testid="bag-member-checkout"
      >
        MONO Member Checkout
      </ButtonLink>
    </>
  );
}

/**
 * The promo-code row under the totals, like Nike's: a ticket, a title and a line of help, and a chevron. A guest is
 * invited to log in; a member is taken to checkout, where "Add a discount code" lives in the Payment step.
 */
function PromoRow({ isGuest }: { isGuest: boolean }) {
  const [open, setOpen] = useState(false);
  const code = useStoredPromo();
  return (
    <>
      <div className="mt-6 flex items-center gap-4 border-y border-line py-4" data-testid="bag-promo-row">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-4 text-left"
          aria-haspopup="dialog"
        >
          <Ticket className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-medium wrap-anywhere">
              {code ? `${code} added` : isGuest ? "Log in to apply promo code" : "Enter a promo code"}
            </span>
            <span className="text-small text-ink-muted">
              {code
                ? "It comes off at checkout"
                : isGuest
                  ? "Get instant savings on your order"
                  : "Get instant savings on your order"}
            </span>
          </span>
          {!code && <ChevronRight className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />}
        </button>
        {code && (
          <Button
            variant="link"
            aria-label={`Remove promo code ${code}`}
            onClick={() => {
              storePromo(null);
            }}
          >
            Remove
          </Button>
        )}
      </div>
      <PromoCodeDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** "Free returns with the Monochrome Pass. Learn more" between hairlines under the bag lines (owner request 2026-11-11). */
function FreeReturns() {
  return (
    <div
      className="flex items-center gap-3 border-y border-line py-4 text-body"
      data-testid="bag-free-returns"
    >
      <PackageCheck className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
      <p>
        <span className="font-medium">Free returns with the Monochrome Pass.</span>{" "}
        <Link href="/returns" className="underline underline-offset-4">
          Learn more
        </Link>
      </p>
    </div>
  );
}

/** Under the bag for a guest: "Want to view your favourites? Join us or Sign in". */
function GuestFavouritesPrompt() {
  return (
    <section aria-labelledby="bag-favourites-heading" className="flex flex-col gap-3">
      <h2 id="bag-favourites-heading" className="font-display text-h2">
        Favourites
      </h2>
      <p className="text-body" data-testid="bag-favourites-prompt">
        Want to view your favourites?{" "}
        <Link href="/login?next=%2Fcart" className="underline underline-offset-4">
          Join us
        </Link>{" "}
        or{" "}
        <Link href="/login?next=%2Fcart" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </section>
  );
}
