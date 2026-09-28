"use client";

import { Button, Link, toast } from "@virzeen/ui";
import { useTransition } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { QuantityStepper } from "@/client/components/shared/quantity-stepper";
import { messageFor } from "@/client/lib/error-messages";
import {
  removeCartItemAction,
  undoRemoveAction,
  updateCartItemAction,
  type CartView,
} from "@/server/actions/cart";
import { useCart } from "./cart-provider";

type Line = CartView["items"][number];

/**
 * One bag line: image, name, variant, quantity stepper, line price, remove with undo (patterns.md §7).
 * In the drawer (`compact`) the drawer shows Undo itself; on the bag page it is a toast.
 */
export function CartLine({ line, compact = false }: { line: Line; compact?: boolean }) {
  const { setCart, setLastRemoved } = useCart();
  const [isPending, startTransition] = useTransition();

  function changeQuantity(quantity: number) {
    startTransition(async () => {
      const result = await updateCartItemAction({ itemId: line.id, quantity });
      if (result.ok) setCart(result.data);
      else toast.error(messageFor(result.error));
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCartItemAction({ itemId: line.id });
      if (!result.ok) return void toast.error(messageFor(result.error));
      setCart(result.data.cart);
      const { removed } = result.data;
      if (compact) return setLastRemoved({ ...removed, productName: line.productName });
      toast.message("Removed from bag", {
        action: {
          label: "Undo",
          onClick: () => {
            startTransition(async () => {
              const undo = await undoRemoveAction(removed);
              if (undo.ok) setCart(undo.data);
              else toast.error(messageFor(undo.error));
            });
          },
        },
      });
    });
  }

  return (
    <li className="flex gap-4 py-4" aria-busy={isPending || undefined}>
      <Link href={`/product/${line.productSlug}`} variant="subtle" className="w-20 shrink-0 sm:w-24">
        <CloudImage src={line.imageUrl} alt={line.imageAlt} sizes="96px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/product/${line.productSlug}`} variant="subtle" className="text-body text-ink">
              {line.productName}
            </Link>
            <p className="text-small text-ink-muted">{line.variantLabel}</p>
          </div>
          <Price paisa={line.lineTotalPaisa} className="shrink-0 text-body" />
        </div>
        {line.isAvailable ? (
          <div className="flex items-center justify-between gap-2">
            <QuantityStepper
              value={line.quantity}
              max={Math.max(line.maxQuantity, line.quantity)}
              onChange={changeQuantity}
              disabled={isPending}
              label={`Quantity of ${line.productName}`}
            />
            {!compact && <Price paisa={line.unitPricePaisa} className="text-small text-ink-muted" />}
            <Button variant="link" size="sm" onClick={remove} disabled={isPending}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-small text-danger">No longer available</p>
            <Button variant="link" size="sm" onClick={remove} disabled={isPending}>
              Remove
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
