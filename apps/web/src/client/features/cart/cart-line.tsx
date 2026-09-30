"use client";

import { Button, cn, Link, toast } from "@virzeen/ui";
import { MAX_QTY_PER_LINE } from "@virzeen/validators";
import { Heart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { QuantityStepper } from "@/client/components/shared/quantity-stepper";
import { useFavourites } from "@/client/features/favourites/favourites-provider";
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

/**
 * One bag line, laid out like Nike's (patterns.md §7): the photo, then the name with the line price on the right, the
 * style and size in grey; under them the quantity pill (a bin at 1 removes the line, with Undo) and the heart.
 */
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
    <li
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 py-6 sm:gap-x-6"
      aria-busy={isPending || undefined}
    >
      <Link href={`/product/${line.productSlug}`} variant="subtle" className="w-28 sm:w-36 lg:w-40">
        <CloudImage src={line.imageUrl} alt={line.imageAlt} sizes="(min-width: 1024px) 160px, 144px" />
      </Link>
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          {/* A long one-word name ("Monochromium") breaks instead of running into the price at 320px. */}
          <Link
            ref={linkRef}
            href={`/product/${line.productSlug}`}
            variant="subtle"
            className="min-w-0 text-body font-medium wrap-anywhere hyphens-auto text-ink hover:text-ink-muted"
          >
            {line.productName}
          </Link>
          <Price paisa={line.lineTotalPaisa} className="shrink-0 text-body font-medium" />
        </div>
        <p className="text-body text-ink-muted">{line.variantLabel}</p>
        {line.quantity > 1 && (
          <p className="text-body text-ink-muted">
            <Price paisa={line.unitPricePaisa} /> each
          </p>
        )}
        {!line.isAvailable && <p className="text-body text-danger">No longer available</p>}
        {note && <p className="text-small text-ink-muted">{note}</p>}
      </div>
      <div className="col-span-2 flex items-center gap-3">
        {line.isAvailable ? (
          <QuantityStepper
            value={line.quantity}
            max={Math.max(line.maxQuantity, line.quantity)}
            onChange={changeQuantity}
            onRemove={remove}
            disabled={isPending}
            label={`Quantity of ${line.productName}`}
          />
        ) : (
          <Button variant="secondary" shape="pill" onClick={remove} disabled={isPending}>
            <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
            Remove
          </Button>
        )}
        {line.isAvailable && <FavouriteToggle line={line} />}
      </div>
    </li>
  );
}

/** The heart beside the quantity, like Nike's bag: saves the product in the style bought (specs/favourites.md). */
function FavouriteToggle({ line }: { line: Line }) {
  const { isSaved, toggle } = useFavourites();
  const router = useRouter();
  const saved = isSaved(line.productId, line.color);

  async function press() {
    const now = await toggle(line.productId, line.color);
    if (now === true) {
      toast.success("Added to favourites", {
        action: { label: "View", onClick: () => router.push("/favourites") },
      });
    } else if (now === false) {
      toast.message("Removed from favourites");
    }
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      shape="pill"
      className="border-line"
      aria-pressed={saved}
      aria-label={`Favourite ${line.productName}`}
      onClick={() => void press()}
    >
      <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.5} aria-hidden />
    </Button>
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
