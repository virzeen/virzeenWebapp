import { cartService } from "@virzeen/core";
import { apiHandler } from "@/server/api/v1";
import { getCartOwner } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** GET /api/v1/cart → Cart (guest cookie or signed-in user) */
export const GET = apiHandler("v1.cart.get", async () => cartService.getSummary(await getCartOwner()));
