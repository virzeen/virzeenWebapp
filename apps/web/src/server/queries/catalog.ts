import "server-only";
import "@/server/bootstrap";
import { catalogReads, portfolioService, reviewService } from "@virzeen/core";
import type { ShopFilters } from "@virzeen/validators";
import { EARLY_ACCESS_HOURS } from "@virzeen/validators/limits";
import { cache } from "react";
import { getUser } from "@/server/auth/session";
import { tierFor } from "@/server/queries/account";

// Read-only data for pages (backend-policies.md §1). Memoised per request with React cache().

/**
 * How many hours before a product's public time this shopper may already see and buy it (specs/member-perks.md): 0 for
 * a guest, 12 for a MONO Member, 48 for the Pass. Memoised per request.
 */
export const getViewerEarlyHours = cache(async (): Promise<number> => {
  const user = await getUser();
  if (!user) return 0;
  return EARLY_ACCESS_HOURS[await tierFor(user.id)];
});

export const listCategories = cache(() => catalogReads.listCategories());
export const hasLiveCollection = cache(async (slug: string) =>
  catalogReads.hasLiveCollection(slug, await getViewerEarlyHours()),
);
export const listProducts = async (filters: ShopFilters) =>
  catalogReads.listProducts(filters, undefined, await getViewerEarlyHours());
export const getProductBySlug = cache(async (slug: string) =>
  catalogReads.getProductBySlug(slug, await getViewerEarlyHours()),
);
/**
 * The carousels under a product (specs/product-page-v2.md): "You may also like" (its category, without it) and "More
 * from Virzeen" (other categories), up to 8 each.
 */
export const listRecommendations = async (product: { id: string; categoryId: string }) =>
  catalogReads.listRecommendations({
    categoryId: product.categoryId,
    excludeId: product.id,
    earlyHours: await getViewerEarlyHours(),
  });
export const listNewArrivals = async (limit?: number) =>
  catalogReads.listNewArrivals(limit, await getViewerEarlyHours());
export const getCategoryBySlug = cache((slug: string) => catalogReads.getCategoryBySlug(slug));
export const getCollectionBySlug = cache(async (slug: string) =>
  catalogReads.getCollectionBySlug(slug, await getViewerEarlyHours()),
);
export const listCollections = async (featuredOnly = false) =>
  catalogReads.listCollections({ featuredOnly, earlyHours: await getViewerEarlyHours() });
export const getFilterOptions = (scope: { category?: string | undefined; collection?: string | undefined }) =>
  catalogReads.getFilterOptions(scope);

/** A product's visible reviews: count and average (specs/reviews.md). */
export const getReviewSummary = cache((productId: string) => reviewService.summary(productId));
export const listProductReviews = (productId: string) => reviewService.listForProduct(productId);

export const listPortfolioProjects = (limit?: number) => portfolioService.listPublished(limit);
export const getPortfolioProject = cache((slug: string) => portfolioService.getPublishedBySlug(slug));
export const listSitemapEntries = () => catalogReads.listSitemapEntries();

/** Everything a shop listing page needs, in one round trip. */
export async function loadShopListing(filters: ShopFilters) {
  const [page, total, categories, options] = await Promise.all([
    listProducts(filters),
    getViewerEarlyHours().then((hours) => catalogReads.countProducts(filters, hours)),
    listCategories(),
    getFilterOptions({ category: filters.category, collection: filters.collection }),
  ]);
  return { page, total, categories, options };
}

export type ShopListingData = Awaited<ReturnType<typeof loadShopListing>>;
