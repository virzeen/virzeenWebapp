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
export {
  adminReads,
  DEFAULT_COUNTRY_OF_ORIGIN,
  type ProductFormValues,
  type SizeGuideForEdit,
} from "./admin/admin-reads";
export { cartService, type CartOwner } from "./cart/cart.service";
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
export {
  checkoutService,
  RESERVATION_MINUTES,
  type CheckoutPreview,
  type PlaceOrderResult,
} from "./orders/checkout.service";
export { ORDER_TRANSITIONS, PAYMENT_TRANSITIONS } from "./orders/order-state";
export { orderService, type AddressSnapshot, type OrderDetail } from "./orders/orders.service";
export { paymentService, type VerifyOutcome, type VerifyResult } from "./payments/payment.service";
export type { CheckoutNext } from "./payments/provider";
export { reconcilePayments, type ReconcileSummary } from "./payments/reconcile";
export { portfolioService } from "./portfolio/portfolio.service";
export { COD_MAX_TOTAL_PAISA, isCodAvailable } from "./pricing/cod-rules";
export { calculateTotals, vatIncluded } from "./pricing/calculate-totals";
export { DELIVERY_ESTIMATES, SHIPPING_RATES_PAISA, shippingZoneFor } from "./pricing/shipping-rates";
