"use client";

import { Button, Stack, toast } from "@virzeen/ui";
import { MAX_QTY_PER_LINE } from "@virzeen/validators/limits";
import { useRef, useState, useTransition } from "react";
import { StockLabel } from "@/client/components/shared/stock-label";
import { useCart } from "@/client/features/cart/cart-provider";
import { favouriteDetails } from "@/client/features/favourites/favourite-bag";
import { FavouriteButton } from "@/client/features/favourites/favourite-button";
import { addToBagMessage, allInBagMessage } from "@/client/lib/error-messages";
import { addToCartAction } from "@/server/actions/cart";
import type { ProductDetailsData, SizeGuideView } from "./product-details-data";
import { useProductSelection } from "./product-selection";
import { SizeGuideDialog } from "./size-guide-dialog";
import { SizePicker } from "./size-picker";
import { galleryFor } from "./style-photos";
import { StylePicker } from "./style-picker";

type ProductPurchaseProps = {
  /** The product: its id, plus the name, category and photos that "Added to favourites" shows. */
  product: Pick<ProductDetailsData, "productId" | "name" | "category" | "images">;
  sizeGuide: SizeGuideView | null;
  /** Styles with their own photos: each style's tile picture (specs/product-styles.md). */
  tiles?: Record<string, string | null>;
  /** Admin preview of an unsaved product: Add to bag and Favourite only say so (its variants may not exist yet). */
  preview?: boolean;
};

/**
 * Style tiles, sizes, stock, "Add to bag" and "Favourite" (patterns.md §6). Unavailable options stay visible but
 * disabled. On phones Add to bag floats alone at the bottom of the screen (`data-sticky-cta`: globals.css keeps focus and the
 * footer clear of it). Pressed before a size is chosen, it points to the sizes instead of doing nothing.
 */
export function ProductPurchase({ product, sizeGuide, tiles, preview = false }: ProductPurchaseProps) {
  const { cart, setCart, open } = useCart();
  const [isPending, startTransition] = useTransition();
  const { variants, colors, sizes, style, size, selected, price } = useProductSelection();
  const [sizeError, setSizeError] = useState(false);
  // The variant whose Add to bag found every piece already in the bag.
  const [allInBagId, setAllInBagId] = useState<string | null>(null);
  const sizeGroupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const anyInStock = variants.some((v) => v.stock > 0);
  const sizeMissing = sizes.length > 0 && !size;
  const soldOut = !anyInStock || (!sizeMissing && (!selected || selected.stock <= 0));
  const limit = selected ? Math.min(selected.stock, MAX_QTY_PER_LINE) : 0;
  const inBag = cart.items.find((item) => item.variantId === selected?.id)?.quantity ?? 0;
  const allInBag = selected !== undefined && allInBagId === selected.id && inBag >= limit;

  function pointToSizes() {
    setSizeError(true);
    const first = sizeGroupRef.current?.querySelector<HTMLElement>('[role="radio"]:not(:disabled)');
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    first?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    first?.focus({ preventScroll: true });
  }

  function addToBag() {
    if (sizeMissing) return pointToSizes();
    if (!selected) return;
    // The server would refuse with "Only N left", which reads like the stock label: say what's going on instead.
    if (inBag >= limit) return setAllInBagId(selected.id);
    if (preview) return void toast.message("This is a preview. Nothing was added to your bag.");
    startTransition(async () => {
      const result = await addToCartAction({ variantId: selected.id, quantity: 1 });
      if (result.ok) {
        setCart(result.data);
        // The open drawer confirms the add (its description says "Added to bag"), so no toast covers it.
        open({ returnFocusTo: buttonRef.current, added: true });
      } else {
        toast.error(addToBagMessage(result.error));
      }
    });
  }

  const buttonLabel = soldOut ? "Out of stock" : sizeMissing ? "Select a size" : "Add to bag";
  const favouriteStyle = style ?? colors[0] ?? "";
  // The style's first photo, as the gallery shows it.
  const [photo] = galleryFor(product.images, favouriteStyle || null, colors);

  return (
    <Stack gap={6}>
      {/* "Size guide" sits beside "Select size"; a product without sizes (a vase in two styles) has it beside Style. */}
      <StylePicker
        tiles={tiles}
        labelAside={sizeGuide && sizes.length === 0 ? <SizeGuideDialog guide={sizeGuide} /> : undefined}
      />
      <SizePicker
        ref={sizeGroupRef}
        error={sizeError}
        onPick={() => setSizeError(false)}
        sizeGuide={sizeGuide}
      />

      {selected ? <StockLabel stock={selected.stock} /> : !anyInStock && <StockLabel stock={0} />}

      <Stack gap={3}>
        {/*
          Phones: only the Add to bag button floats over the bottom of the page, with nothing behind it (owner,
          2026-10-01: no price, "the bg need to be opacity 0"), a little taller and 20% narrower than the screen's
          width, centred (owner, same day). Taps on the bar's empty sides reach the page under it. From md it sits in
          the column as usual.
        */}
        <div
          data-sticky-cta
          className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-4 md:pointer-events-auto md:static md:p-0"
        >
          <Button
            ref={buttonRef}
            size="lg"
            shape="pill"
            className="pointer-events-auto mx-auto flex h-14 w-4/5 md:h-12 md:w-full"
            loading={isPending}
            disabled={soldOut}
            onClick={addToBag}
            data-testid="add-to-bag"
          >
            {buttonLabel}
          </Button>
          <div role="status">
            {allInBag && (
              // With nothing behind the bar on phones, the note gets its own backing to stay readable.
              <p className="pointer-events-auto mx-auto mt-2 w-4/5 rounded-sm bg-canvas px-2 py-1 text-small text-ink-muted md:mt-0 md:w-auto md:p-0 md:pt-2">
                {allInBagMessage(limit)}
              </p>
            )}
          </div>
        </div>
        {/* Saves the style picked now ("" for a product without styles; the first style when all are sold out). */}
        <FavouriteButton
          productId={product.productId}
          color={favouriteStyle}
          summary={{
            name: product.name,
            details: favouriteDetails({ category: product.category.name, style: favouriteStyle }),
            imageUrl: photo?.url ?? null,
            imageAlt: photo?.alt ?? product.name,
            pricePaisa: price.paisa,
          }}
          preview={preview}
        />
      </Stack>
    </Stack>
  );
}
