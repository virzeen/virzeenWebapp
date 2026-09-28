import { cartService } from "@virzeen/core";
import { idSchema } from "@virzeen/validators";
import { z } from "zod";
import { apiHandler, readJson } from "@/server/api/v1";
import { ensureCart } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ itemId: string }> };

const bodySchema = z.strictObject({ quantity: z.int().min(1).max(10) });

/** PATCH /api/v1/cart/items/:itemId { quantity } → Cart */
export const PATCH = apiHandler<Context>("v1.cart.update", async (request, { params }) => {
  const actor = await ensureCart();
  await rateLimit("cart:write", actor.key);
  const itemId = idSchema.parse((await params).itemId);
  const { quantity } = bodySchema.parse(await readJson(request));
  return cartService.updateQuantity({ cartId: actor.cartId, itemId, quantity });
});

/** DELETE /api/v1/cart/items/:itemId → Cart */
export const DELETE = apiHandler<Context>("v1.cart.remove", async (_request, { params }) => {
  const actor = await ensureCart();
  await rateLimit("cart:write", actor.key);
  const itemId = idSchema.parse((await params).itemId);
  return (await cartService.removeItem({ cartId: actor.cartId, itemId })).cart;
});
