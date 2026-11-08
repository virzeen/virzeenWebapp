import { describe, expect, it } from "vitest";
import { productSearchSchema, shopFiltersSchema } from "./catalog";
import { SEARCH_QUERY_MAX } from "./limits";

// specs/search.md: the query from the URL falls back quietly; the panel's query is checked strictly.

describe("shopFiltersSchema q", () => {
  it("trims the query and keeps it", () => {
    expect(shopFiltersSchema.parse({ q: "  black tee " }).q).toBe("black tee");
  });

  it("drops an empty, blank or too long query instead of failing the page", () => {
    expect(shopFiltersSchema.parse({}).q).toBeUndefined();
    expect(shopFiltersSchema.parse({ q: "   " }).q).toBeUndefined();
    expect(shopFiltersSchema.parse({ q: "x".repeat(SEARCH_QUERY_MAX + 1) }).q).toBeUndefined();
  });

  it("keeps the other filters beside it", () => {
    const filters = shopFiltersSchema.parse({ q: "linen", size: "M", sort: "price-asc" });
    expect(filters).toMatchObject({ q: "linen", size: "M", sort: "price-asc" });
  });
});

describe("productSearchSchema", () => {
  it("accepts 2 to 60 characters after trimming", () => {
    expect(productSearchSchema.parse({ q: " li " }).q).toBe("li");
    expect(productSearchSchema.safeParse({ q: "x".repeat(SEARCH_QUERY_MAX) }).success).toBe(true);
  });

  it("rejects one character, too long queries and unknown fields", () => {
    expect(productSearchSchema.safeParse({ q: " l " }).success).toBe(false);
    expect(productSearchSchema.safeParse({ q: "x".repeat(SEARCH_QUERY_MAX + 1) }).success).toBe(false);
    expect(productSearchSchema.safeParse({ q: "linen", limit: 50 }).success).toBe(false);
  });
});
