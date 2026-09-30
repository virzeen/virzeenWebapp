"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { CartView } from "@/server/actions/cart";

type Line = CartView["items"][number];

/**
 * A line just removed, kept so the bag page can offer Undo where it was removed. `addedAt` lets Undo put it back
 * in the same place.
 */
export type RemovedLine = { variantId: string; quantity: number; addedAt: Date; productName: string };

type OpenOptions = {
  /** Where keyboard focus goes back to when the panel closes (patterns.md §7). Defaults to the focused element. */
  returnFocusTo?: HTMLElement | null;
  /** Opened because something was just added: the panel shows that line. */
  added?: boolean;
};

type CartContextValue = {
  cart: CartView;
  /** Replace the cart with the one a Server Action returned (instant UI update). */
  setCart: (cart: CartView) => void;
  /** The "Added to bag" panel. */
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  open: (options?: OpenOptions) => void;
  /** Element the panel returns focus to on close: it has no trigger of its own. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
  /** True from an add-to-bag until the bag changes again or the panel closes. */
  justAdded: boolean;
  /** The line the last add went into, for the "Added to bag" panel. */
  addedLine: Line | null;
};

const CartContext = createContext<CartContextValue | null>(null);

/** The line whose quantity went up between two carts: the one an add went into. */
export function lineAdded(before: CartView, after: CartView): Line | null {
  const had = new Map(before.items.map((item) => [item.variantId, item.quantity]));
  return after.items.find((item) => item.quantity > (had.get(item.variantId) ?? 0)) ?? null;
}

/** Holds the bag for the header, the "Added to bag" panel and add-to-bag buttons. Server data wins on re-render. */
export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartView;
  children: React.ReactNode;
}) {
  const [serverCart, setServerCart] = useState(initialCart);
  const [cart, setCartState] = useState(initialCart);
  const [isOpen, setIsOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [addedLine, setAddedLine] = useState<Line | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // The cart before and after the latest setCart, read in open() right after an add (same event, before React
  // re-renders), so the panel knows which line the add went into.
  const latestRef = useRef({ before: initialCart, after: initialCart });

  // Adopt fresh server data after revalidation (React "adjust state when a prop changes" pattern).
  if (initialCart !== serverCart) {
    setServerCart(initialCart);
    setCartState(initialCart);
  }

  // A change made after an add (quantity, remove, undo) ends the "Added to bag" moment.
  function setCart(next: CartView) {
    // `cart` is the bag as the customer saw it when they pressed the button.
    latestRef.current = { before: cart, after: next };
    setCartState(next);
    setJustAdded(false);
  }

  function setOpen(open: boolean) {
    setIsOpen(open);
    if (!open) setJustAdded(false);
  }

  function open({ returnFocusTo, added = false }: OpenOptions = {}) {
    const focused = document.activeElement;
    returnFocusRef.current =
      returnFocusTo ?? (focused instanceof HTMLElement && focused !== document.body ? focused : null);
    setJustAdded(added);
    setAddedLine(added ? lineAdded(latestRef.current.before, latestRef.current.after) : null);
    setOpen(true);
  }

  return (
    <CartContext value={{ cart, setCart, isOpen, setOpen, open, returnFocusRef, justAdded, addedLine }}>
      {children}
    </CartContext>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>.");
  return ctx;
}
