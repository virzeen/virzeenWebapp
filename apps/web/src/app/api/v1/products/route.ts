import { catalogReads } from "@virzeen/core";
import { shopFiltersSchema } from "@virzeen/validators";
import { z } from "zod";
import { apiHandler } from "@/server/api/v1";

export const dynamic = "force-dynamic";

const limitSchema = z.coerce.number().int().min(1).max(50).catch(24);

/** GET /api/v1/products?category&collection&cursor&limit → ProductSummary[] + nextCursor */
export const GET = apiHandler("v1.products.list", async (request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = shopFiltersSchema.parse(params);
  const page = await catalogReads.listProducts(filters, limitSchema.parse(params.limit));
  return { data: page.items, nextCursor: page.nextCursor };
});
