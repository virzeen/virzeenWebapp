"use server";

import "server-only";
import {
  favouriteService,
  type FavouritePhoto,
  type FavouriteVariant,
  type ProductSummary,
} from "@virzeen/core";
import {
  favouriteProductsSchema,
  mergeFavouritesSchema,
  setFavouriteSchema,
  type FavouriteKey,
  type SetFavouriteInput,
} from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/actions/result";
import { requireUser } from "@/server/auth/session";
import { toFavouriteView } from "@/server/queries/account";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

// Favourites (specs/favourites.md). Guests keep theirs in the browser; these save a signed-in customer's to the
// account, move a guest's browser list there after sign-in, and look up the products for a guest's list.

/** A favourite as client components get it: the saved style and its product card. `savedAt` is ISO or null. */
export type FavouriteView = {
  productId: string;
  /** The saved style (variant colour); "" for a product without styles. With productId, the favourite's key. */
  color: string;
  /** The style the card names and opens: `color`, or "" when there's none or it isn't sold any more. */
  style: string;
  /** When the account saved it; null for a guest's (the browser keeps its own time). */
  savedAt: string | null;
  product: ProductSummary;
  /** The product's category name ("Tops"). */
  category: string;
  /** The saved style's variants for sale (stock 0 when sold out), sizes in shop order; [] when the style is gone. */
  variants: FavouriteVariant[];
  /** The saved style's photos, for the Add to bag popup (every photo without a style, or when it isn't sold). */
  photos: FavouritePhoto[];
};

/** Save (`saved: true`) or remove one favourite for the signed-in customer. Idempotent. */
export async function setFavouriteAction(input: unknown) {
  return runAction("setFavourite", async (): Promise<SetFavouriteInput> => {
    const user = await requireUser();
    await rateLimit("favourite", `user:${user.id}`);
    const data = setFavouriteSchema.parse(input);
    const result = await favouriteService.set(user.id, data);
    revalidatePath("/favourites");
    return result;
  });
}

/** After sign-in: adds the browser's favourites to the account. Returns the account's keys, newest first. */
export async function mergeFavouritesAction(input: unknown) {
  return runAction("mergeFavourites", async (): Promise<FavouriteKey[]> => {
    const user = await requireUser();
    await rateLimit("favourite", `user:${user.id}`);
    const { keys } = mergeFavouritesSchema.parse(input);
    const merged = await favouriteService.merge(user.id, keys);
    revalidatePath("/favourites");
    return merged;
  });
}

/** A guest's Favourites page: the product cards for the browser's list, in its order (public, limited per IP). */
export async function listFavouriteProductsAction(input: unknown) {
  return runAction("listFavouriteProducts", async (): Promise<FavouriteView[]> => {
    await rateLimit("favourite", await clientIp());
    const { keys } = favouriteProductsSchema.parse(input);
    const items = await favouriteService.summariesFor(keys);
    return items.map(toFavouriteView);
  });
}
