"use server";

import "server-only";
import { reviewService } from "@virzeen/core";
import { reviewSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/actions/result";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

/** Saves the signed-in customer's review of a product delivered to them (specs/reviews.md). */
export async function saveReviewAction(input: unknown) {
  return runAction("saveReview", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const data = reviewSchema.parse(input);
    const saved = await reviewService.save(user.id, data);
    revalidatePath(`/product/${saved.productSlug}`);
    revalidatePath(`/account/reviews/${saved.productSlug}`);
    return saved;
  });
}
