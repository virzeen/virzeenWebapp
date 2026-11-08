"use server";

import "server-only";
import { catalogReads } from "@virzeen/core";
import { productSearchSchema, shopFiltersSchema } from "@virzeen/validators";
import { runAction } from "@/server/actions/result";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/** How many products the header search panel shows while typing (specs/search.md). */
const SEARCH_PANEL_RESULTS = 6;

/** The header search panel's live results: the newest matches; `nextCursor` says there are more. */
export async function searchProductsAction(input: unknown) {
  return runAction("searchProducts", async () => {
    await rateLimit("api", await clientIp());
    const { q } = productSearchSchema.parse(input);
    return catalogReads.listProducts({ q, sort: "newest", inStock: false }, SEARCH_PANEL_RESULTS);
  });
}

/** "Load more" on shop pages: the next page of products for the same filters (cursor pagination). */
export async function loadMoreProductsAction(input: unknown) {
  return runAction("loadMoreProducts", async () => {
    await rateLimit("api", await clientIp());
    const filters = shopFiltersSchema.parse(input);
    return catalogReads.listProducts(filters);
  });
}
