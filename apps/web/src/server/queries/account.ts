import "server-only";
import "@/server/bootstrap";
import {
  addressService,
  favouriteService,
  memberService,
  orderService,
  reviewService,
  stockAlertService,
  variantPath,
  type FavouriteItem,
  type StockAlertItem,
} from "@virzeen/core";
import type { FavouriteView } from "@/server/actions/favourites";
import type { StockAlertRow } from "@/server/actions/stock-alerts";

// Every read is scoped to the signed-in user id (security-policy.md §3).

export const listMyOrders = (userId: string, cursor?: string) =>
  orderService.listForUser(userId, { cursor, limit: 20 });
/** The member's level and Pass dates for the profile and the Membership page (specs/membership-portal.md). */
/** Who is buying, for the bag's price hints: a guest, a MONO Member or a member with a running Pass. */
export const tierFor = (userId: string | null) => memberService.tierFor(userId);
export const getMyMembership = (userId: string) => memberService.membership(userId);
/** What the Pass has saved this member so far, for the Pass portal. */
export const getMyPassSavings = (userId: string) => memberService.passSavings(userId);
export const listMyAddresses = (userId: string) => addressService.list(userId);
/** The review page (specs/reviews.md): the product, whether this customer may review it, and their review. */
export const getMyReviewPage = (userId: string, productSlug: string) =>
  reviewService.forCustomer(userId, productSlug);

/** A favourite as client components get it (the time as an ISO string). */
export const toFavouriteView = (item: FavouriteItem): FavouriteView => ({
  ...item,
  savedAt: item.savedAt?.toISOString() ?? null,
});

/** The Favourites page for a signed-in customer: newest first, products on sale only. */
export const listMyFavourites = async (userId: string) =>
  (await favouriteService.list(userId)).map(toFavouriteView);

/** Which products and styles the customer saved, for every Favourite button (one indexed query). */
export const listMyFavouriteKeys = (userId: string) => favouriteService.listKeys(userId);

/** The customer's waiting "Notify me" requests, newest first, as the profile lists them (specs/notify-me.md). */
export const listMyStockAlerts = async (userId: string): Promise<StockAlertRow[]> =>
  (await stockAlertService.listForUser(userId)).map((item: StockAlertItem) => ({
    variantId: item.variantId,
    productName: item.productName,
    href: variantPath(item.productSlug, item.color, item.size),
    variantLabel: item.variantLabel,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
  }));

/** Which of a product's variants the customer is waiting for (the product page's Notify me button). */
export const listMyWaitingVariantIds = (userId: string, variantIds: readonly string[]) =>
  stockAlertService.waitingVariantIds(userId, variantIds);

/** Another customer's order → null (the page shows 404). */
export async function getMyOrder(userId: string, orderNumber: string) {
  try {
    return await orderService.getForUser(userId, orderNumber);
  } catch {
    return null;
  }
}

export type MyOrder = NonNullable<Awaited<ReturnType<typeof getMyOrder>>>;
