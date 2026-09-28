import { AppError, checkoutService } from "@virzeen/core";
import { checkoutSchema } from "@virzeen/validators";
import { apiHandler, readJson } from "@/server/api/v1";
import { ensureCart, requireUser } from "@/server/auth/session";
import { features } from "@/server/env";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const ENABLED = { COD: () => true, ESEWA: () => features.esewa, KHALTI: () => features.khalti } as const;

/** POST /api/v1/checkout { addressId, paymentMethod } → { orderNumber, next } */
export const POST = apiHandler(
  "v1.checkout",
  async (request) => {
    const user = await requireUser();
    await rateLimit("checkout", `user:${user.id}`);
    const data = checkoutSchema.parse(await readJson(request));
    if (!ENABLED[data.paymentMethod]()) {
      throw new AppError("VALIDATION_FAILED", "This payment method isn't available right now.", {
        fields: { paymentMethod: "Choose another payment method" },
      });
    }
    const { cartId } = await ensureCart();
    return checkoutService.placeOrder({
      userId: user.id,
      customerEmail: user.email,
      cartId,
      addressId: data.addressId,
      paymentMethod: data.paymentMethod,
    });
  },
  201,
);
