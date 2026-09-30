import "server-only";
import "@/server/bootstrap";
import { catalogReads, portfolioService } from "@virzeen/core";
import type { ShopFilters } from "@virzeen/validators";
import { cache } from "react";

// Read-only data for pages (backend-policies.md §1). Memoised per request with React cache().

export const listCategories = cache(() => catalogReads.listCategories());
export const listProducts = (filters: ShopFilters) => catalogReads.listProducts(filters);
export const getProductBySlug = cache((slug: string) => catalogReads.getProductBySlug(slug));
/**
 * The carousels under a product (specs/product-page-v2.md): "You may also like" (its category, without it) and "More
 * from Virzeen" (other categories), up to 8 each.
 */
export const listRecommendations = (product: { id: string; categoryId: string }) =>
  catalogReads.listRecommendations({ categoryId: product.categoryId, excludeId: product.id });
export const listNewArrivals = (limit?: number) => catalogReads.listNewArrivals(limit);
export const getCategoryBySlug = cache((slug: string) => catalogReads.getCategoryBySlug(slug));
export const getCollectionBySlug = cache((slug: string) => catalogReads.getCollectionBySlug(slug));
export const listCollections = (featuredOnly = false) => catalogReads.listCollections({ featuredOnly });
export const getFilterOptions = (scope: { category?: string | undefined; collection?: string | undefined }) =>
  catalogReads.getFilterOptions(scope);

export const listPortfolioProjects = (limit?: number) => portfolioService.listPublished(limit);
export const getPortfolioProject = cache((slug: string) => portfolioService.getPublishedBySlug(slug));
export const listSitemapEntries = () => catalogReads.listSitemapEntries();

/** Everything a shop listing page needs, in one round trip. */
export async function loadShopListing(filters: ShopFilters) {
  const [page, categories, options] = await Promise.all([
    listProducts(filters),
    listCategories(),
    getFilterOptions({ category: filters.category, collection: filters.collection }),
  ]);
  return { page, categories, options };
}

export type ShopListingData = Awaited<ReturnType<typeof loadShopListing>>;
