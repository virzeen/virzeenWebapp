"use server";

import "server-only";
import { catalogReads } from "@virzeen/core";
import { shopFiltersSchema } from "@virzeen/validators";
import { runAction } from "@/server/actions/result";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/** "Load more" on shop pages: the next page of products for the same filters (cursor pagination). */
export async function loadMoreProductsAction(input: unknown) {
  return runAction("loadMoreProducts", async () => {
    await rateLimit("api", await clientIp());
    const filters = shopFiltersSchema.parse(input);
    return catalogReads.listProducts(filters);
  });
}
