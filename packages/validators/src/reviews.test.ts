import { describe, expect, it } from "vitest";
import { REVIEW_BODY_MAX, reviewSchema, reviewVisibilitySchema } from "./reviews";

const productId = "tz4a98xxat96iws9zmbrgj3a";

describe("reviewSchema", () => {
  it("accepts stars alone, trimming the optional title and text", () => {
    expect(reviewSchema.parse({ productId, rating: 5, title: "  ", body: " Soft linen. " })).toEqual({
      productId,
      rating: 5,
      title: "",
      body: "Soft linen.",
    });
  });

  it("asks for a rating from 1 to 5 stars", () => {
    for (const rating of [0, 6, 2.5]) {
      const result = reviewSchema.safeParse({ productId, rating, title: "", body: "" });
      expect(result.error?.issues[0]?.message).toBe("Choose a rating");
    }
  });

  it("limits the text and refuses unknown fields", () => {
    const long = reviewSchema.safeParse({
      productId,
      rating: 4,
      title: "",
      body: "x".repeat(REVIEW_BODY_MAX + 1),
    });
    expect(long.error?.issues[0]?.message).toBe("Keep your review under 1,000 characters");
    expect(
      reviewSchema.safeParse({ productId, rating: 4, title: "", body: "", hiddenAt: null }).success,
    ).toBe(false);
  });
});

describe("reviewVisibilitySchema", () => {
  it("takes a review id and whether to hide it", () => {
    expect(reviewVisibilitySchema.parse({ reviewId: productId, hidden: true })).toEqual({
      reviewId: productId,
      hidden: true,
    });
    expect(reviewVisibilitySchema.safeParse({ reviewId: "Not an id!", hidden: true }).success).toBe(false);
    expect(reviewVisibilitySchema.safeParse({ reviewId: productId, hidden: "yes" }).success).toBe(false);
  });
});
