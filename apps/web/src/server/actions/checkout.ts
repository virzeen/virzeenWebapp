"use server";

import "server-only";
import { AppError, checkoutService } from "@virzeen/core";
import { checkoutSchema, idSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/actions/result";
import { ensureCart, requireUser } from "@/server/auth/session";
import { features } from "@/server/env";
import { rateLimit } from "@/server/security/rate-limit";

const previewSchema = z.strictObject({ addressId: idSchema.nullable() });

/** Server-calculated totals for the chosen address (the client never sends a price). */
export async function previewCheckoutAction(input: unknown) {
  return runAction("previewCheckout", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const { addressId } = previewSchema.parse(input);
    const { cartId } = await ensureCart();
    return checkoutService.preview({ userId: user.id, cartId, addressId });
  });
}

const METHOD_ENABLED = {
  COD: () => true,
  ESEWA: () => features.esewa,
  KHALTI: () => features.khalti,
} as const;

/** "Place order" (docs/specs/checkout.md). Payment state changes happen only in core. */
export async function placeOrderAction(input: unknown) {
  return runAction("placeOrder", async () => {
    const user = await requireUser(); // 1. authenticate
    await rateLimit("checkout", `user:${user.id}`); // 2. rate-limit
    const data = checkoutSchema.parse(input); // 3. validate
    if (!METHOD_ENABLED[data.paymentMethod]()) {
      throw new AppError("VALIDATION_FAILED", "This payment method isn't available right now.", {
        fields: { paymentMethod: "Choose another payment method" },
      });
    }
    const { cartId } = await ensureCart();
    const result = await checkoutService.placeOrder({
      // 4. core
      userId: user.id,
      customerEmail: user.email,
      cartId,
      addressId: data.addressId,
      paymentMethod: data.paymentMethod,
    });
    revalidatePath("/", "layout");
    return result;
  });
}
