"use client";

import { Button, FormField, RadioGroup, RadioGroupItem, Stack, toast } from "@virzeen/ui";
import { useState, useTransition } from "react";
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
};

/**
 * Variant pickers, stock and "Add to bag" (patterns.md §6). Unavailable options stay visible but disabled.
 * On phones the button sits in a sticky bottom bar.
 */
export function ProductPurchase({ variants, sizes, colors }: ProductPurchaseProps) {
  const { setCart, open } = useCart();
  const [isPending, startTransition] = useTransition();
  const firstInStockColor =
    colors.find((c) => variants.some((v) => v.color === c && v.stock > 0)) ?? colors[0] ?? null;
  const [color, setColor] = useState<string | null>(firstInStockColor);
  const [size, setSize] = useState<string | null>(null);

  const needsSize = sizes.length > 0;
  const variantFor = (c: string | null, s: string | null) =>
    variants.find((v) => (colors.length === 0 || v.color === c) && (!needsSize || v.size === s));
  const selected = needsSize && !size ? undefined : variantFor(color, size);

  const prices = variants.map((v) => v.pricePaisa);
  const hasRange = Math.min(...prices) !== Math.max(...prices);
  const displayPrice = selected?.pricePaisa ?? Math.min(...prices);
  const colorHasStock = (c: string) => variants.some((v) => v.color === c && v.stock > 0);
  const anyInStock = variants.some((v) => v.stock > 0);

  function addToBag() {
    if (!selected) return;
    startTransition(async () => {
      const result = await addToCartAction({ variantId: selected.id, quantity: 1 });
      if (result.ok) {
        setCart(result.data);
        toast.success("Added to bag");
        open();
      } else {
        toast.error(addToBagMessage(result.error));
      }
    });
  }

  const buttonLabel = !anyInStock
    ? "Out of stock"
    : needsSize && !size
      ? "Select a size"
      : selected && selected.stock > 0
        ? "Add to bag"
        : "Out of stock";

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
        <FormField label="Size">
          <RadioGroup variant="card" value={size ?? ""} onValueChange={setSize}>
            {sizes.map((s) => {
              const variant = variantFor(color, s);
              return <RadioGroupItem key={s} value={s} label={s} disabled={!variant || variant.stock <= 0} />;
            })}
          </RadioGroup>
        </FormField>
      )}

      {selected ? <StockLabel stock={selected.stock} /> : !anyInStock && <StockLabel stock={0} />}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-4">
          <Price paisa={displayPrice} className="text-body md:hidden" />
          <Button
            size="lg"
            shape="pill"
            className="flex-1"
            loading={isPending}
            disabled={!selected || selected.stock <= 0}
            onClick={addToBag}
            data-testid="add-to-bag"
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </Stack>
  );
}
