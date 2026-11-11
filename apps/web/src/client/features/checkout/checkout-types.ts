/** The server's checkout summary as the client sees it (checkoutService.preview, specs/checkout-v2-week1.md). */
export type CheckoutTotals = {
  subtotalPaisa: number;
  shippingPaisa: number;
  discountPaisa: number;
  /** True when `discountPaisa` is the Monochrome Pass 10%, not a code's. */
  isPassDiscount: boolean;
  /** The code whose discount is in these totals (specs/discount-codes.md), or null. */
  discountCode: string | null;
  totalPaisa: number;
  vatPaisa: number;
  tier: "GUEST" | "MEMBER" | "PASS";
  /** "Nov 17 to 19" */
  arrivesBy: string;
  freeDeliveryRemainingPaisa: number;
  memberSavingPaisa: number;
  /** A Pass member's saving on this bag (the 10% and the delivery fee a MONO Member would pay). */
  passSavingPaisa: number;
  isCodAvailable: boolean;
  codLimitPaisa: number | null;
};
