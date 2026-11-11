/** The server's checkout summary as the client sees it (checkoutService.preview, specs/checkout-v2-week1.md). */
export type CheckoutTotals = {
  subtotalPaisa: number;
  shippingPaisa: number;
  discountPaisa: number;
  /** The code whose discount is in these totals (specs/discount-codes.md), or null. */
  discountCode: string | null;
  totalPaisa: number;
  vatPaisa: number;
  tier: "GUEST" | "MEMBER";
  /** "Nov 17 to 19" */
  arrivesBy: string;
  freeDeliveryRemainingPaisa: number;
  memberSavingPaisa: number;
  isCodAvailable: boolean;
  codLimitPaisa: number | null;
};
