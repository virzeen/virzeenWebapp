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

/**
 * Whether this shopper is on the Monochrome Pass: only the Pass may buy members-only products, which everyone else sees
 * locked (specs/catalog-groups-visibility.md). Memoised per request.
 */
export const getViewerIsPass = cache(
  async (): Promise<boolean> => (await getViewerEarlyHours()) >= EARLY_ACCESS_HOURS.PASS,
);

/** Every collection the viewer may see, in menu order (the header, the shop filter, the home tiles). */
export const listShopCollections = cache(async () =>
  catalogReads.listShopCollections(await getViewerEarlyHours()),
);
export const hasLiveCollection = cache(async (slug: string) =>
  catalogReads.hasLiveCollection(slug, await getViewerEarlyHours()),
);
/** The shop grid: products anyone may buy; the members-only ones go in their own row (`listMembersOnly`). */
export const listProducts = async (filters: ShopFilters) =>
  catalogReads.listProducts(filters, undefined, await getViewerEarlyHours(), "exclude");

/** How many members-only products the "For Members only" row shows at most. */
const MEMBERS_ROW_SHOWN = 12;

/** The "For Members only" row of a shop page: the members-only products for the same filters, newest first. */
export const listMembersOnly = async (filters: ShopFilters) =>
  catalogReads.listProducts(
    { ...filters, cursor: undefined },
    MEMBERS_ROW_SHOWN,
    await getViewerEarlyHours(),
    "only",
  );
export const getProductBySlug = cache(async (slug: string) =>
  catalogReads.getProductBySlug(slug, await getViewerEarlyHours()),
);
/**
 * The carousels under a product (specs/product-page-v2.md): "You may also like" (its main collection, without it) and
 * "More from Virzeen" (other collections), up to 8 each.
 */
export const listRecommendations = async (product: { id: string; mainCollectionId: string }) =>
  catalogReads.listRecommendations({
    collectionId: product.mainCollectionId,
    excludeId: product.id,
    earlyHours: await getViewerEarlyHours(),
  });
export const listNewArrivals = async (limit?: number) =>
  catalogReads.listNewArrivals(limit, await getViewerEarlyHours());
export const getCollectionBySlug = cache(async (slug: string) =>
  catalogReads.getCollectionBySlug(slug, await getViewerEarlyHours()),
);
export const listCollections = async (featuredOnly = false) =>
  catalogReads.listCollections({ featuredOnly, earlyHours: await getViewerEarlyHours() });
export const listHomeTiles = async () => catalogReads.listHomeTiles(await getViewerEarlyHours());
export const getFilterOptions = async (scope: { collection?: string | undefined }) =>
  catalogReads.getFilterOptions(scope, await getViewerEarlyHours());

/** A product's visible reviews: count and average (specs/reviews.md). */
export const getReviewSummary = cache((productId: string) => reviewService.summary(productId));
export const listProductReviews = (productId: string) => reviewService.listForProduct(productId);

export const listPortfolioProjects = (limit?: number) => portfolioService.listPublished(limit);
export const getPortfolioProject = cache((slug: string) => portfolioService.getPublishedBySlug(slug));
export const listSitemapEntries = () => catalogReads.listSitemapEntries();

/** Everything a shop listing page needs, in one round trip. */
export async function loadShopListing(filters: ShopFilters) {
  const [page, total, membersOnly, collections, options] = await Promise.all([
    listProducts(filters),
    getViewerEarlyHours().then((hours) => catalogReads.countProducts(filters, hours, "exclude")),
    listMembersOnly(filters),
    listShopCollections(),
    getFilterOptions({ collection: filters.collection }),
  ]);
  return { page, total, membersOnly: membersOnly.items, collections, options };
}

export type ShopListingData = Awaited<ReturnType<typeof loadShopListing>>;
