import { z } from "zod";
import { idSchema } from "./common";

// Favourites (specs/favourites.md): a product plus the style picked when saved.

/** Most favourites one account (or one browser) keeps. */
export const MAX_FAVOURITES = 100;

/** A saved product and style; `color` is the variant colour, "" for a product without styles. */
export const favouriteKeySchema = z.strictObject({
  productId: idSchema,
  color: z.string().trim().max(40, { error: "Keep the style under 40 characters" }),
});
export type FavouriteKey = z.infer<typeof favouriteKeySchema>;

/** Save or remove one favourite. An explicit `saved` (not a toggle) keeps double clicks and retries harmless. */
export const setFavouriteSchema = favouriteKeySchema.extend({ saved: z.boolean() });
export type SetFavouriteInput = z.infer<typeof setFavouriteSchema>;

export const favouriteKeysSchema = z
  .array(favouriteKeySchema)
  .max(MAX_FAVOURITES, { error: `You can save up to ${MAX_FAVOURITES} favourites` });

/** A guest's browser favourites moved to their account after sign-in, newest first. */
export const mergeFavouritesSchema = z.strictObject({ keys: favouriteKeysSchema });
export type MergeFavouritesInput = z.infer<typeof mergeFavouritesSchema>;

/** A guest's browser favourites, looked up to show on the Favourites page. */
export const favouriteProductsSchema = z.strictObject({ keys: favouriteKeysSchema });
export type FavouriteProductsInput = z.infer<typeof favouriteProductsSchema>;
