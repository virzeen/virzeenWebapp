"use server";

import "server-only";
import { reviewService } from "@virzeen/core";
import { reviewVisibilitySchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAdminAction } from "./guard";

/** Hides a review from the shop, or shows it again (specs/reviews.md). Audited in core. */
export async function setReviewVisibilityAction(input: unknown) {
  return runAdminAction("setReviewVisibility", async (admin) => {
    const data = reviewVisibilitySchema.parse(input);
    const { productSlug } = await reviewService.setHidden(admin.id, data);
    revalidatePath(`/product/${productSlug}`);
    revalidatePath("/admin/reviews");
    return { reviewId: data.reviewId, hidden: data.hidden };
  });
}
