import type { ActionError } from "@/server/actions/result";

// Maps error codes to the exact copy in docs/ui/content-style.md "Standard messages".
const MESSAGES: Partial<Record<ActionError["code"], string>> = {
  OUT_OF_STOCK: "Some items just sold out. We've updated your bag.",
  PRICE_CHANGED: "A price changed since you added this item. Please review your bag.",
  PAYMENT_FAILED: "Payment didn't go through. Your bag is saved — try again or choose another method.",
  PAYMENT_PENDING:
    "We're confirming your payment. This usually takes a minute — you'll get an email when it's done.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes and try again.",
  INTERNAL: "Something went wrong on our side. Please try again.",
  UNAUTHENTICATED: "Please sign in to continue.",
  CART_EMPTY: "Your bag is empty.",
};

// For these codes the server message is already customer-facing and more specific ("Only 2 left").
const USE_SERVER_MESSAGE = new Set<ActionError["code"]>([
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT",
  "FORBIDDEN",
]);

export function messageFor(error: Pick<ActionError, "code" | "message">): string {
  if (USE_SERVER_MESSAGE.has(error.code)) return error.message;
  return MESSAGES[error.code] ?? MESSAGES.INTERNAL!;
}

/** Add-to-bag shows the precise stock message ("Only 2 left") instead of the checkout wording. */
export function addToBagMessage(error: Pick<ActionError, "code" | "message">): string {
  return error.code === "OUT_OF_STOCK" ? error.message : messageFor(error);
}
