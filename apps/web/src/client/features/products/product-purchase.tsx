"use client";

import { Button, Stack, toast } from "@virzeen/ui";
import { MAX_QTY_PER_LINE } from "@virzeen/validators";
import { useRef, useState, useTransition } from "react";
import { Price } from "@/client/components/shared/price";
import { StockLabel } from "@/client/components/shared/stock-label";
import { useCart } from "@/client/features/cart/cart-provider";
import { FavouriteButton } from "@/client/features/favourites/favourite-button";
import { addToBagMessage } from "@/client/lib/error-messages";
import { addToCartAction } from "@/server/actions/cart";
import type { SizeGuideView } from "./product-details-data";
import { useProductSelection } from "./product-selection";
import { SizePicker } from "./size-picker";
import { StylePicker } from "./style-picker";

type ProductPurchaseProps = {
  productId: string;
  sizeGuide: SizeGuideView | null;
  /** Styles with their own photos: each style's tile picture (specs/product-styles.md). */
  tiles?: Record<string, string | null>;
  /** Admin preview of an unsaved product: Add to bag and Favourite only say so (its variants may not exist yet). */
  preview?: boolean;
};

/** Why Add to bag stops: the bag already holds every piece left, or the per-line cap. */
function allInBagMessage(limit: number): string {
  if (limit === MAX_QTY_PER_LINE) return `Limit ${limit} of each — you already have ${limit} in your bag.`;
  return limit === 1 ? "The last one is already in your bag." : `All ${limit} left are already in your bag.`;
}

/**
 * Style tiles, sizes, stock, "Add to bag" and "Favourite" (patterns.md §6). Unavailable options stay visible but
 * disabled. On phones Add to bag sits in a sticky bottom bar (`data-sticky-cta`: globals.css keeps focus and the
 * footer clear of it). Pressed before a size is chosen, it points to the sizes instead of doing nothing.
 */
export function ProductPurchase({ productId, sizeGuide, tiles, preview = false }: ProductPurchaseProps) {
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

  return (
    <Stack gap={6}>
      <StylePicker tiles={tiles} />
      <SizePicker
        ref={sizeGroupRef}
        error={sizeError}
        onPick={() => setSizeError(false)}
        sizeGuide={sizeGuide}
      />

      {selected ? <StockLabel stock={selected.stock} /> : !anyInStock && <StockLabel stock={0} />}

      <Stack gap={3}>
        <div
          data-sticky-cta
          className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
        >
          <div className="flex items-center gap-4">
            <Price paisa={price.paisa} from={price.from} className="text-body md:hidden" />
            <Button
              ref={buttonRef}
              size="lg"
              shape="pill"
              className="flex-1"
              loading={isPending}
              disabled={soldOut}
              onClick={addToBag}
              data-testid="add-to-bag"
            >
              {buttonLabel}
            </Button>
          </div>
          <div role="status">
            {allInBag && <p className="pt-2 text-small text-ink-muted">{allInBagMessage(limit)}</p>}
          </div>
        </div>
        {/* Saves the style picked now ("" for a product without styles; the first style when all are sold out). */}
        <FavouriteButton productId={productId} color={style ?? colors[0] ?? ""} preview={preview} />
      </Stack>
    </Stack>
  );
}
