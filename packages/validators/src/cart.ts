import { z } from "zod";
import { idSchema } from "./common";
import { MAX_QTY_PER_LINE } from "./limits";

const quantity = z
  .int({ error: "Choose a quantity" })
  .min(1, { error: "Choose a quantity" })
  .max(MAX_QTY_PER_LINE, { error: `You can add up to ${MAX_QTY_PER_LINE} of one item` });

export const addToCartSchema = z.strictObject({ variantId: idSchema, quantity });
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.strictObject({ itemId: idSchema, quantity });
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const removeCartItemSchema = z.strictObject({ itemId: idSchema });
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
