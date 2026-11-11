import "server-only";
import "@/server/bootstrap";
import {
  adminReads,
  catalogReads,
  discountService,
  orderService,
  portfolioService,
  reviewService,
  stockAlertService,
  stockInsights,
} from "@virzeen/core";
import type { AdminOrderFilters, AdminProductFilters, AdminReviewFilters } from "@virzeen/validators";
import { cache } from "react";
import { features } from "@/server/env";

// Admin read models. Pages call requireAdminPage() before any of these. The single-item reads are memoised per
// request with React cache(): generateMetadata and the page both read the item.

export const getDashboardStats = () => orderService.dashboardStats();
/** The dashboard's "Low stock" (the first 8 sizes) and "Best sellers" (last 30 days, top 5). */
export const getLowStock = () => stockInsights.lowStock(8);
export const getBestSellers = () => stockInsights.bestSellers();
export const listAdminOrders = (filters: AdminOrderFilters) => orderService.listForAdmin(filters);
export const listAdminProducts = ({ q, status }: AdminProductFilters) => adminReads.listProducts(q, status);
export const getProductStatusCounts = () => adminReads.productStatusCounts();
export const listAdminCategories = () => adminReads.listCategories();
export const listAdminCollections = () => adminReads.listCollections();
export const listAdminSizeGuides = () => adminReads.listSizeGuides();
export const listAdminCustomers = (page: number, query = "") => adminReads.listCustomers(page, query);
export const listAdminReviews = (filters: AdminReviewFilters) => reviewService.listForAdmin(filters);
export const listAdminDiscounts = () => discountService.listForAdmin();
export const listAdminPortfolio = () => portfolioService.listForAdmin();
export const listProductOptions = () => adminReads.listProductOptions();
export const uploadsEnabled = () => features.cloudinary;

export const getAdminOrder = cache(async (orderNumber: string) => {
  try {
    return await orderService.getForAdmin(orderNumber);
  } catch {
    return null;
  }
});

export const getProductForEdit = cache(async (id: string) => {
  try {
    return await adminReads.getProductForEdit(id);
  } catch {
    return null;
  }
});

/** Customers waiting for each of a product's sold-out variants (specs/notify-me.md): variant id → count. */
export const getWaitingCounts = (productId: string) => stockAlertService.waitingCounts(productId);

/** null when missing or archived (the page shows 404). */
export const getSizeGuideForEdit = cache((id: string) => adminReads.getSizeGuideForEdit(id));

export const getPortfolioProjectForEdit = cache(async (id: string) => {
  try {
    return await portfolioService.getForAdmin(id);
  } catch {
    return null;
  }
});

/** Categories, collections and size guides for the product form. */
export async function getProductFormOptions() {
  const [categories, collections, sizeGuides] = await Promise.all([
    adminReads.listCategories(),
    adminReads.listCollections(),
    adminReads.listSizeGuideOptions(),
  ]);
  return {
    // slug: the editor's preview links the breadcrumb to the category's shop page.
    categories: categories.map((c) => ({ value: c.id, label: c.name, slug: c.slug })),
    collections: collections.map((c) => ({ id: c.id, name: c.name })),
    // The whole guide, so the preview's Size guide popup shows it without a database read.
    sizeGuides,
  };
}

export const listPublicCategories = () => catalogReads.listCategories();
