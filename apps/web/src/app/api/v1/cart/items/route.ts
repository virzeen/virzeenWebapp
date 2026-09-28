import { cartService } from "@virzeen/core";
import { addToCartSchema } from "@virzeen/validators";
import { apiHandler, readJson } from "@/server/api/v1";
import { ensureCart } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

/** POST /api/v1/cart/items { variantId, quantity } → Cart */
export const POST = apiHandler(
  "v1.cart.add",
  async (request) => {
    const actor = await ensureCart();
    await rateLimit("cart:add", actor.key);
    const data = addToCartSchema.parse(await readJson(request));
    return cartService.addItem({ cartId: actor.cartId, ...data });
  },
  201,
);
