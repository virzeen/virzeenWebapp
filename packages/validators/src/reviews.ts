import { z } from "zod";
import { idSchema } from "./common";

// Product reviews (specs/reviews.md).

export const REVIEW_TITLE_MAX = 80;
export const REVIEW_BODY_MAX = 1000;
export const REVIEW_RATINGS = [5, 4, 3, 2, 1] as const;

/** A customer's review: the form and `saveReviewAction` share it. Title and text are optional. */
export const reviewSchema = z
  .object({
    productId: idSchema,
    rating: z
      .number({ error: "Choose a rating" })
      .int({ error: "Choose a rating" })
      .min(1, { error: "Choose a rating" })
      .max(5, { error: "Choose a rating" }),
    title: z
      .string()
      .trim()
      .max(REVIEW_TITLE_MAX, { error: `Keep your title under ${REVIEW_TITLE_MAX} characters` }),
    body: z
      .string()
      .trim()
      .max(REVIEW_BODY_MAX, {
        error: `Keep your review under ${REVIEW_BODY_MAX.toLocaleString("en-IN")} characters`,
      }),
  })
  .strict();
export type ReviewInput = z.input<typeof reviewSchema>;
export type ReviewData = z.output<typeof reviewSchema>;

/** Admin: hide a review from the shop, or show it again. */
export const reviewVisibilitySchema = z.object({ reviewId: idSchema, hidden: z.boolean() }).strict();
export type ReviewVisibilityInput = z.output<typeof reviewVisibilitySchema>;

/** Admin reviews list filter, from the URL (anything odd falls back to all). */
export const adminReviewFiltersSchema = z.object({
  status: z.enum(["shown", "hidden"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type AdminReviewFilters = z.output<typeof adminReviewFiltersSchema>;
