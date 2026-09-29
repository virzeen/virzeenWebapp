"use client";

import { Button, FormField, RadioGroup, RadioGroupItem, Stack, toast } from "@virzeen/ui";
import { MAX_QTY_PER_LINE } from "@virzeen/validators";
import { useRef, useState, useTransition } from "react";
import { Price } from "@/client/components/shared/price";
import { StockLabel } from "@/client/components/shared/stock-label";
import { useCart } from "@/client/features/cart/cart-provider";
import { addToBagMessage } from "@/client/lib/error-messages";
import { addToCartAction } from "@/server/actions/cart";

type Variant = { id: string; size: string | null; color: string | null; pricePaisa: number; stock: number };

type ProductPurchaseProps = {
  variants: Variant[];
  sizes: string[];
  colors: string[];
  /** Admin preview of an unsaved product: Add to bag only says so (its variants may not exist yet). */
  preview?: boolean;
};

/** Why Add to bag stops: the bag already holds every piece left, or the per-line cap. */
function allInBagMessage(limit: number): string {
  if (limit === MAX_QTY_PER_LINE) return `Limit ${limit} of each — you already have ${limit} in your bag.`;
  return limit === 1 ? "The last one is already in your bag." : `All ${limit} left are already in your bag.`;
}

/**
 * Variant pickers, stock and "Add to bag" (patterns.md §6). Unavailable options stay visible but disabled.
 * On phones the button sits in a sticky bottom bar (`data-sticky-cta`: globals.css keeps focus and the footer
 * clear of it). Pressed before a size is chosen, it points to the sizes instead of doing nothing.
 */
export function ProductPurchase({ variants, sizes, colors, preview = false }: ProductPurchaseProps) {
  const { cart, setCart, open } = useCart();
  const [isPending, startTransition] = useTransition();
  // A sold-out product starts with no colour picked, so no chip looks both selected and crossed out.
  const firstInStockColor = colors.find((c) => variants.some((v) => v.color === c && v.stock > 0)) ?? null;
  const [color, setColor] = useState<string | null>(firstInStockColor);
  const [size, setSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  // The variant whose Add to bag found every piece already in the bag.
  const [allInBagId, setAllInBagId] = useState<string | null>(null);
  const sizeGroupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const needsSize = sizes.length > 0;
  const variantFor = (c: string | null, s: string | null) =>
    variants.find((v) => (colors.length === 0 || v.color === c) && (!needsSize || v.size === s));
  const selected = needsSize && !size ? undefined : variantFor(color, size);

  const prices = variants.map((v) => v.pricePaisa);
  const hasRange = Math.min(...prices) !== Math.max(...prices);
  const displayPrice = selected?.pricePaisa ?? Math.min(...prices);
  const colorHasStock = (c: string) => variants.some((v) => v.color === c && v.stock > 0);
  const anyInStock = variants.some((v) => v.stock > 0);

  const sizeMissing = needsSize && !size;
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
      <Price paisa={displayPrice} from={hasRange && !selected} className="text-h3" />

      {colors.length > 0 && (
        <FormField label={color ? `Colour: ${color}` : "Colour"}>
          <RadioGroup
            variant="card"
            value={color ?? ""}
            onValueChange={(value) => {
              setColor(value);
              if (size && !variantFor(value, size)?.stock) setSize(null);
            }}
            className="grid-cols-2 sm:grid-cols-3"
          >
            {colors.map((c) => (
              <RadioGroupItem key={c} value={c} label={c} disabled={!colorHasStock(c)} />
            ))}
          </RadioGroup>
        </FormField>
      )}

      {needsSize && (
        <FormField label="Size" error={sizeError ? "Select a size" : undefined}>
          <RadioGroup
            ref={sizeGroupRef}
            variant="card"
            value={size ?? ""}
            onValueChange={(value) => {
              setSize(value);
              setSizeError(false);
            }}
          >
            {sizes.map((s) => {
              const variant = variantFor(color, s);
              return <RadioGroupItem key={s} value={s} label={s} disabled={!variant || variant.stock <= 0} />;
            })}
          </RadioGroup>
        </FormField>
      )}

      {selected ? <StockLabel stock={selected.stock} /> : !anyInStock && <StockLabel stock={0} />}

      <div
        data-sticky-cta
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
      >
        <div className="flex items-center gap-4">
          <Price paisa={displayPrice} className="text-body md:hidden" />
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
    </Stack>
  );
}
