"use server";

import "server-only";
import { AppError, checkoutService } from "@virzeen/core";
import { checkoutPreviewSchema, checkoutSchema, emailSchema, guestCheckoutSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/actions/result";
import { ensureCart, getUser } from "@/server/auth/session";
import { grantGuestOrderAccess } from "@/server/auth/guest-order";
import { features } from "@/server/env";
import {
  clientIp,
  rateLimit,
  rateLimitDiscountCheck,
  rateLimitGuestCheckout,
} from "@/server/security/rate-limit";
import { sendDueStockAlerts } from "@/server/services/stock-alerts";

/**
 * Server-calculated totals for the checkout summary (the client never sends a price): a signed-in member's saved
 * address, or a guest's district and email. A code that can't be used comes back as a field error for `discountCode`.
 */
export async function previewCheckoutAction(input: unknown) {
  return runAction("previewCheckout", async () => {
    const user = await getUser(); // 1. who (a guest is allowed)
    if (user)
      await rateLimit("account", `user:${user.id}`); // 2. rate-limit
    else await rateLimitGuestCheckout();
    const { addressId, district, email, discountCode } = checkoutPreviewSchema.parse(input); // 3. validate
    if (discountCode) {
      if (user) await rateLimitDiscountCheck(user.id);
      else await rateLimit("discount:ip", await clientIp());
    }
    const { cartId } = await ensureCart();
    return checkoutService.preview({
      // 4. core
      userId: user?.id ?? null,
      cartId,
      addressId: user ? (addressId ?? null) : null,
      ...(!user && district ? { district } : {}),
      ...(!user && email ? { email } : {}),
      ...(discountCode ? { discountCode } : {}),
    });
  });
}

const METHOD_ENABLED = {
  COD: () => true,
  ESEWA: () => features.esewa,
  KHALTI: () => features.khalti,
} as const;

function assertMethodEnabled(method: keyof typeof METHOD_ENABLED) {
  if (!METHOD_ENABLED[method]()) {
    throw new AppError("VALIDATION_FAILED", "This payment method isn't available right now.", {
      fields: { paymentMethod: "Choose another payment method" },
    });
  }
}

/** "Place order" for a signed-in member (docs/specs/checkout.md). Payment state changes happen only in core. */
export async function placeOrderAction(input: unknown) {
  return runAction("placeOrder", async () => {
    const user = await getUser(); // 1. authenticate
    if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
    await rateLimit("checkout", `user:${user.id}`); // 2. rate-limit
    const data = checkoutSchema.parse(input); // 3. validate
    if (data.discountCode) await rateLimitDiscountCheck(user.id);
    assertMethodEnabled(data.paymentMethod);
    const { cartId } = await ensureCart();
    // An online payment that can't start cancels the order and returns its stock ("Notify me", specs/notify-me.md).
    if (data.paymentMethod !== "COD") sendDueStockAlerts();
    const result = await checkoutService.placeOrder({
      // 4. core
      userId: user.id,
      customerEmail: user.email,
      cartId,
      addressId: data.addressId,
      paymentMethod: data.paymentMethod,
      ...(data.discountCode ? { discountCode: data.discountCode } : {}),
    });
    revalidatePath("/", "layout");
    return result;
  });
}

/**
 * "Place order" for a guest (specs/checkout-v2-week1.md). No account: the order keeps the typed address and email, and a
 * signed cookie lets this browser open the confirmation page. A signed-in customer who ends up here is refused so a
 * member can't skip the member path by mistake.
 */
export async function placeGuestOrderAction(input: unknown) {
  return runAction("placeGuestOrder", async () => {
    if (await getUser())
      throw new AppError(
        "VALIDATION_FAILED",
        "You are signed in. Refresh the page to check out as a member.",
      );
    const data = guestCheckoutSchema.parse(input); // validate before the limiter so it can key on the email
    await rateLimitGuestCheckout(data.email);
    if (data.discountCode) await rateLimit("discount:ip", await clientIp());
    assertMethodEnabled(data.paymentMethod);
    const { cartId } = await ensureCart();
    if (data.paymentMethod !== "COD") sendDueStockAlerts();
    const result = await checkoutService.placeOrder({
      userId: null,
      customerEmail: data.email,
      cartId,
      guestAddress: {
        fullName: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        province: data.province,
        district: data.district,
        city: data.municipality,
        street: `Ward ${data.ward}, ${data.street}`,
        landmark: data.landmark ? data.landmark : null,
      },
      ...(data.notes ? { deliveryNotes: data.notes } : {}),
      paymentMethod: data.paymentMethod,
      ...(data.discountCode ? { discountCode: data.discountCode } : {}),
    });
    await grantGuestOrderAccess(result.orderNumber);
    revalidatePath("/", "layout");
    return result;
  });
}

/**
 * "You have a MONO account. Log in to get member prices." for a guest who typed a registered email. Limited to 10 a
 * minute per IP (specs/checkout-v2-week1.md, security: the answer says whether an email is registered).
 */
export async function guestEmailHasAccountAction(input: unknown) {
  return runAction("guestEmailHasAccount", async () => {
    await rateLimit("checkout:identify", await clientIp());
    const email = emailSchema.parse(input);
    return { hasAccount: await checkoutService.emailHasAccount(email) };
  });
}
