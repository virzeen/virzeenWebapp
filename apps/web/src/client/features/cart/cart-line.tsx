"use client";

import { Button, cn, Link, toast } from "@virzeen/ui";
import { MAX_QTY_PER_LINE } from "@virzeen/validators";
import { useId, useLayoutEffect, useRef, useState, useTransition } from "react";
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
import { useCart, type RemovedLine } from "./cart-provider";

type Line = CartView["items"][number];

/** True when the focused control just disappeared (or was disabled) and focus fell back to the page. */
const focusWasLost = () => document.activeElement === null || document.activeElement === document.body;

/** Why "+" is disabled: stock or the per-line cap (ui-discipline §6: a disabled control shows a reason). */
function limitNote(line: Line): string | null {
  if (line.quantity < line.maxQuantity) return null;
  if (line.maxQuantity <= 0) return "Out of stock";
  return line.maxQuantity === MAX_QTY_PER_LINE
    ? `Limit ${MAX_QTY_PER_LINE} of each`
    : `Only ${line.maxQuantity} left`;
}

type CartLineProps = {
  line: Line;
  /** Called after a remove succeeds; the parent shows "Removed X. Undo" where the line was. */
  onRemoved: (removed: RemovedLine) => void;
  /** Focus the product link on mount when focus was lost: this is the line Undo just put back. */
  focusOnMount?: boolean;
};

/** One bag line: image, name, variant, quantity stepper, line price, remove with undo (patterns.md §7). */
export function CartLine({ line, onRemoved, focusOnMount = false }: CartLineProps) {
  const { setCart } = useCart();
  const [isPending, startTransition] = useTransition();
  const linkRef = useRef<HTMLAnchorElement>(null);
  // Read once: only the mount right after an Undo takes focus, never a later re-render.
  const focusOnMountRef = useRef(focusOnMount);
  // The button pressed (−, + or Remove): the line's controls are disabled while the change is saved,
  // which drops keyboard focus to the page.
  const pressedRef = useRef<HTMLElement | null>(null);
  const note = line.isAvailable ? limitNote(line) : null;

  useLayoutEffect(() => {
    if (focusOnMountRef.current && focusWasLost()) linkRef.current?.focus();
  }, []);

  // Once saved, focus goes back to the pressed button, or to the other stepper button when "+" or "−"
  // has just reached its limit.
  useLayoutEffect(() => {
    const pressed = pressedRef.current;
    if (isPending || !pressed) return;
    pressedRef.current = null;
    if (!focusWasLost() || !pressed.isConnected) return;
    const target = pressed.matches(":disabled")
      ? pressed.closest('[role="group"]')?.querySelector<HTMLElement>("button:not(:disabled)")
      : pressed;
    target?.focus();
  }, [isPending]);

  function rememberPressed() {
    const focused = document.activeElement;
    pressedRef.current = focused instanceof HTMLElement && focused !== document.body ? focused : null;
  }

  function changeQuantity(quantity: number) {
    rememberPressed();
    startTransition(async () => {
      const result = await updateCartItemAction({ itemId: line.id, quantity });
      if (result.ok) setCart(result.data);
      else toast.error(messageFor(result.error));
    });
  }

  function remove() {
    rememberPressed();
    startTransition(async () => {
      const result = await removeCartItemAction({ itemId: line.id });
      if (!result.ok) return void toast.error(messageFor(result.error));
      setCart(result.data.cart);
      onRemoved({ ...result.data.removed, productName: line.productName });
    });
  }

  return (
    <li className="flex gap-4 py-4" aria-busy={isPending || undefined}>
      <Link href={`/product/${line.productSlug}`} variant="subtle" className="w-20 shrink-0 sm:w-24">
        <CloudImage src={line.imageUrl} alt={line.imageAlt} sizes="96px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          {/* A long one-word name ("Monochromium") breaks instead of running into the price at 320px. */}
          <div className="min-w-0 wrap-anywhere hyphens-auto">
            <Link
              ref={linkRef}
              href={`/product/${line.productSlug}`}
              variant="subtle"
              className="text-body text-ink"
            >
              {line.productName}
            </Link>
            <p className="text-small text-ink-muted">{line.variantLabel}</p>
            {line.quantity > 1 && (
              <p className="text-small text-ink-muted">
                <Price paisa={line.unitPricePaisa} /> each
              </p>
            )}
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
        {note && <p className="text-small text-ink-muted">{note}</p>}
      </div>
    </li>
  );
}

type RemovedLineNoticeProps = {
  line: RemovedLine;
  /** Called once the line is back in the bag. */
  onUndone: () => void;
  className?: string;
};

/**
 * "Removed X. Undo" where the line was removed: behind the modal drawer a toast's Undo can't be reached, and on
 * the bag page it would sit far from the line. Keyboard focus lands on Undo instead of falling to the page.
 */
export function RemovedLineNotice({ line, onUndone, className }: RemovedLineNoticeProps) {
  const { setCart } = useCart();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const textId = useId();

  // On mount (the removed line took focus with it) and after a failed undo re-enables the button.
  useLayoutEffect(() => {
    if (!isPending && focusWasLost()) undoRef.current?.focus();
  }, [isPending]);

  function undo() {
    startTransition(async () => {
      const result = await undoRemoveAction({
        variantId: line.variantId,
        quantity: line.quantity,
        addedAt: line.addedAt,
      });
      if (!result.ok) return setError(messageFor(result.error));
      setCart(result.data);
      onUndone();
    });
  }

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <p id={textId} className="text-small text-ink-muted">
        {error ?? `Removed ${line.productName}.`}
      </p>
      <Button
        ref={undoRef}
        variant="link"
        size="sm"
        onClick={undo}
        disabled={isPending}
        aria-describedby={textId}
      >
        Undo
      </Button>
    </div>
  );
}
