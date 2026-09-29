import "server-only";
import "@/server/bootstrap";
import { addressService, favouriteService, orderService, type FavouriteItem } from "@virzeen/core";
import type { FavouriteView } from "@/server/actions/favourites";

// Every read is scoped to the signed-in user id (security-policy.md §3).

export const listMyOrders = (userId: string, cursor?: string) =>
  orderService.listForUser(userId, { cursor, limit: 20 });
export const listMyAddresses = (userId: string) => addressService.list(userId);

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

/** Another customer's order → null (the page shows 404). */
export async function getMyOrder(userId: string, orderNumber: string) {
  try {
    return await orderService.getForUser(userId, orderNumber);
  } catch {
    return null;
  }
}

export type MyOrder = NonNullable<Awaited<ReturnType<typeof getMyOrder>>>;
