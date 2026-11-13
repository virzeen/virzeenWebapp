// Public entry for @virzeen/core — all business logic (CLAUDE.md §8). Server-only.
export {
  configureCore,
  getCoreConfig,
  isCoreConfigured,
  type CoreConfig,
  type Logger,
  type Mailer,
  type OutgoingEmail,
} from "./config";
export { AppError, ERROR_CODES, isAppError, type ErrorCode } from "./errors";

export { addressService, MAX_ADDRESSES, type SavedAddress } from "./addresses/address.service";
export { adminAccounts, type AdminAccount } from "./admin/admin-accounts";
export { stockInsights, type BestSellerRow, type LowStockRow } from "./admin/stock-insights";
export {
  ADMIN_REVIEWS_PAGE_SIZE,
  REVIEWS_SHOWN,
  reviewService,
  type ReviewSummary,
  type ReviewView,
} from "./reviews/review.service";
export {
  adminReads,
  DEFAULT_COUNTRY_OF_ORIGIN,
  type ProductFormValues,
  type SizeGuideForEdit,
} from "./admin/admin-reads";
export { cartService, type CartOwner } from "./cart/cart.service";
export {
  ADMIN_DISCOUNTS_SHOWN,
  discountService,
  type AdminDiscountRow,
  type DiscountStatus,
} from "./discounts/discount.service";
export { type CartLine, type CartSummary } from "./cart/cart-summary";
export {
  catalogReads,
  PAGE_SIZE,
  type ProductDetail,
  type ProductPage,
  type ProductRecommendations,
  type ProductSizeGuide,
  type ProductSummary,
} from "./catalog/catalog.reads";
export { catalogService, type SavedProduct } from "./catalog/catalog.service";
export {
  favouriteService,
  type FavouriteItem,
  type FavouritePhoto,
  type FavouriteVariant,
} from "./favourites/favourite.service";
export { notifications, PAYMENT_METHOD_LABELS } from "./notifications/notifications";
export { stockAlertService, variantPath, type StockAlertItem } from "./stock-alerts/stock-alert.service";
export {
  checkoutService,
  RESERVATION_MINUTES,
  type CheckoutPreview,
  type PlaceOrderResult,
} from "./orders/checkout.service";
export { ORDER_TRANSITIONS, PAYMENT_TRANSITIONS } from "./orders/order-state";
export { walletService, type WalletBalances, type WalletSummary } from "./wallet/wallet.service";
export { memberService, type SignupProfile } from "./members/member.service";
export { perksService, type ExpressStatus } from "./members/perks.service";
export { referralService, type ReferralSummary } from "./members/referral.service";
export { orderService, type AddressSnapshot, type OrderDetail } from "./orders/orders.service";
export { paymentService, type VerifyOutcome, type VerifyResult } from "./payments/payment.service";
export type { CheckoutNext } from "./payments/provider";
export { reconcilePayments, type ReconcileSummary } from "./payments/reconcile";
export { portfolioService } from "./portfolio/portfolio.service";
export { COD_MAX_TOTAL_PAISA, isCodAvailable } from "./pricing/cod-rules";
export { calculateTotals, vatIncluded } from "./pricing/calculate-totals";
export {
  arrivalWindow,
  DELIVERY_FEES,
  deliveryFeeFor,
  memberDeliverySaving,
  remainingForFreeDelivery,
  shippingZoneFor,
} from "./pricing/shipping-rates";
