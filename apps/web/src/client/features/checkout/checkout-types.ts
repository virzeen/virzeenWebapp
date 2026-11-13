/** The server's checkout summary as the client sees it (checkoutService.preview, specs/checkout-v2-week1.md). */
export type CheckoutTotals = {
  subtotalPaisa: number;
  shippingPaisa: number;
  discountPaisa: number;
  /** True when `discountPaisa` is the Monochrome Pass 10%, not a code's. */
  isPassDiscount: boolean;
  /** True when `discountPaisa` is the birthday reward (5% MONO Member, 15% Pass), not a code's. */
  isBirthdayDiscount: boolean;
  /** Gift wrapping in the total (0 when not chosen, and for the Pass), and what it costs this buyer (specs/member-perks.md). */
  giftWrapPaisa: number;
  giftWrapPricePaisa: number;
  /** Express Delivery for this buyer and address, with this month's uses. */
  express: {
    available: boolean;
    reason: "GUEST" | "AREA" | "USED" | null;
    allowed: number;
    used: number;
    left: number;
    withinHours: boolean;
  };
  /** The code whose discount is in these totals (specs/discount-codes.md), or null. */
  discountCode: string | null;
  totalPaisa: number;
  vatPaisa: number;
  tier: "GUEST" | "MEMBER" | "PASS";
  /** "Nov 17 to 19" */
  arrivesBy: string;
  freeDeliveryRemainingPaisa: number;
  memberSavingPaisa: number;
  /** Points spent (1 point = Rs 1) and credit spent (paisa): both already off the total (specs/wallet.md). */
  pointsUsed: number;
  creditUsedPaisa: number;
  /** What the member has to spend now (zero for guests). */
  walletPoints: number;
  walletCreditPaisa: number;
  /** A Pass member's saving on this bag (the 10% and the delivery fee a MONO Member would pay). */
  passSavingPaisa: number;
  isCodAvailable: boolean;
  codLimitPaisa: number | null;
};
