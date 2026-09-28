"use client";

import { createContext, useContext, useState } from "react";
import type { CartView } from "@/server/actions/cart";

type CartContextValue = {
  cart: CartView;
  /** Replace the cart with the one a Server Action returned (instant UI update). */
  setCart: (cart: CartView) => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  open: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/** Holds the bag for the header, drawer and add-to-bag buttons. Server data wins whenever it re-renders. */
export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartView;
  children: React.ReactNode;
}) {
  const [serverCart, setServerCart] = useState(initialCart);
  const [cart, setCart] = useState(initialCart);
  const [isOpen, setOpen] = useState(false);

  // Adopt fresh server data after revalidation (React "adjust state when a prop changes" pattern).
  if (initialCart !== serverCart) {
    setServerCart(initialCart);
    setCart(initialCart);
  }

  return (
    <CartContext value={{ cart, setCart, isOpen, setOpen, open: () => setOpen(true) }}>
      {children}
    </CartContext>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>.");
  return ctx;
}
