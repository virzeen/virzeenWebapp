import { useSyncExternalStore } from "react";

// The promo code a customer entered on the bag page, kept in this browser until checkout applies it (the server
// checks it again there and when the order is placed). Never a price: only the code the customer typed.
const KEY = "vz_promo";

export function readStoredPromo(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function storePromo(code: string | null) {
  try {
    if (code) window.localStorage.setItem(KEY, code);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the code can still be entered at checkout.
  }
  listeners.forEach((listener) => listener());
}

/** The stored code as a value that is null on the server and during hydration, so pages and first render agree. */
export function useStoredPromo(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readStoredPromo,
    () => null,
  );
}
