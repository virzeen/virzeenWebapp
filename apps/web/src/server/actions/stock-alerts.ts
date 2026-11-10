"use server";

import "server-only";
import { stockAlertService } from "@virzeen/core";
import { stockAlertSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/actions/result";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

// "Notify me when it's back" (specs/notify-me.md): signed-in customers only.

/** A waiting request as the profile's "Notify me" list shows it. */
export type StockAlertRow = {
  variantId: string;
  productName: string;
  /** The product page in the variant's style and size. */
  href: string;
  /** "Black / M". */
  variantLabel: string;
  imageUrl: string | null;
  imageAlt: string;
};

/** Starts waiting for a sold-out variant. Idempotent. */
export async function requestStockAlertAction(input: unknown) {
  return runAction("requestStockAlert", async () => {
    const user = await requireUser();
    await rateLimit("alert", `user:${user.id}`);
    const { variantId } = stockAlertSchema.parse(input);
    await stockAlertService.request(user.id, variantId);
    revalidatePath("/account");
    return { variantId, waiting: true };
  });
}

/** Stops waiting. Idempotent. */
export async function cancelStockAlertAction(input: unknown) {
  return runAction("cancelStockAlert", async () => {
    const user = await requireUser();
    await rateLimit("alert", `user:${user.id}`);
    const { variantId } = stockAlertSchema.parse(input);
    await stockAlertService.cancel(user.id, variantId);
    revalidatePath("/account");
    return { variantId, waiting: false };
  });
}
