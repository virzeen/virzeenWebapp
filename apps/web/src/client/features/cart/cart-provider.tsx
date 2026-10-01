"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { CartView } from "@/server/actions/cart";

/**
 * A line just removed, kept so the bag page can offer Undo where it was removed. `addedAt` lets Undo put it back
 * in the same place.
 */
export type RemovedLine = { variantId: string; quantity: number; addedAt: Date; productName: string };

type OpenOptions = {
  /** Where keyboard focus goes back to when the drawer closes (patterns.md §7). Defaults to the focused element. */
  returnFocusTo?: HTMLElement | null;
  /** Opened because something was just added: the drawer says "Added to bag". */
  added?: boolean;
};

type CartContextValue = {
  cart: CartView;
  /** Replace the cart with the one a Server Action returned (instant UI update). */
  setCart: (cart: CartView) => void;
  /** The bag drawer. */
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  open: (options?: OpenOptions) => void;
  /** Element the drawer returns focus to on close: it has no trigger of its own. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
  /** True from an add-to-bag until the bag changes again or the drawer closes. */
  justAdded: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

/** Holds the bag for the header, the bag drawer and add-to-bag buttons. Server data wins on re-render. */
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
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Adopt fresh server data after revalidation (React "adjust state when a prop changes" pattern).
  if (initialCart !== serverCart) {
    setServerCart(initialCart);
    setCartState(initialCart);
  }

  // A change made after an add (quantity, remove, undo) ends the "Added to bag" moment.
  function setCart(next: CartView) {
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
    setOpen(true);
  }

  return (
    <CartContext value={{ cart, setCart, isOpen, setOpen, open, returnFocusRef, justAdded }}>
      {children}
    </CartContext>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>.");
  return ctx;
}
