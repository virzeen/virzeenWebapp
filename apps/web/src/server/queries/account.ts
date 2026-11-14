import "server-only";
import "@/server/bootstrap";
import {
  addressService,
  catalogReads,
  walletService,
  favouriteService,
  interestService,
  memberService,
  orderService,
  perksService,
  referralService,
  reviewService,
  settingsService,
  stockAlertService,
  variantPath,
  type FavouriteItem,
  type StockAlertItem,
} from "@virzeen/core";
import { EARLY_ACCESS_HOURS } from "@virzeen/validators/limits";
import type { FavouriteView } from "@/server/actions/favourites";
import type { StockAlertRow } from "@/server/actions/stock-alerts";

// Every read is scoped to the signed-in user id (security-policy.md §3).

export const listMyOrders = (userId: string, cursor?: string) =>
  orderService.listForUser(userId, { cursor, limit: 20 });
/** The member's level and Pass dates for the profile and the Membership page (specs/membership-portal.md). */
/** Who is buying, for the bag's price hints: a guest, a MONO Member or a member with a running Pass. */
export const tierFor = (userId: string | null) => memberService.tierFor(userId);
/** Points and credit: balances, what expires first and the newest lines (specs/wallet.md). */
export const getMyWallet = (userId: string) => walletService.summary(userId);
export const getMyMembership = (userId: string) => memberService.membership(userId);
/** The member's referral code, friends and credit earned (specs/member-perks.md). */
export const getMyReferral = (userId: string) => referralService.summary(userId);
/** Express Delivery uses this month and whether it is the birthday month, for the portal's perks. */
export const getMyPerks = async (userId: string) => {
  const tier = await memberService.tierFor(userId);
  const [express, birthdayMonth, hasBirthday] = await Promise.all([
    perksService.expressStatus({ userId, tier, district: "Kathmandu" }),
    perksService.isBirthdayMonth(userId),
    perksService.hasBirthday(userId),
  ]);
  const earlyHours = EARLY_ACCESS_HOURS[tier];
  const early = { hours: earlyHours, items: await catalogReads.listEarlyAccess(earlyHours) };
  return { tier, express, birthdayMonth, hasBirthday, early };
};
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

/** Interests (the profile's "Interests" block): the member's saved categories and collections. */
export const getMyInterests = (userId: string) => interestService.list(userId);
/** What the member can choose from in the Interests dialog (collections in early access included for them). */
export const getInterestOptions = async (userId: string) =>
  interestService.options(EARLY_ACCESS_HOURS[await tierFor(userId)]);
/** "Find your next favourite": by the member's interests, never a product they may not see. */
export const getMyRecommendations = async (userId: string) =>
  interestService.recommendations(userId, EARLY_ACCESS_HOURS[await tierFor(userId)]);
/** Settings: the payment method they ticked, the email tick and the name shown on reviews. */
export const getMySettings = (userId: string) => settingsService.get(userId);
