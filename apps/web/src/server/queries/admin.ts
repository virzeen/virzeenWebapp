import "server-only";
import "@/server/bootstrap";
import { adminReads, catalogReads, orderService, portfolioService } from "@virzeen/core";
import type { AdminOrderFilters } from "@virzeen/validators";
import { cache } from "react";
import { features } from "@/server/env";

// Admin read models. Pages call requireAdminPage() before any of these. The single-item reads are memoised per
// request with React cache(): generateMetadata and the page both read the item.

export const getDashboardStats = () => orderService.dashboardStats();
export const listAdminOrders = (filters: AdminOrderFilters) => orderService.listForAdmin(filters);
export const listAdminProducts = (query?: string) => adminReads.listProducts(query);
export const listAdminCategories = () => adminReads.listCategories();
export const listAdminCollections = () => adminReads.listCollections();
export const listAdminCustomers = (page: number) => adminReads.listCustomers(page);
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

export const getPortfolioProjectForEdit = cache(async (id: string) => {
  try {
    return await portfolioService.getForAdmin(id);
  } catch {
    return null;
  }
});

/** Categories + collections for the product form. */
export async function getProductFormOptions() {
  const [categories, collections] = await Promise.all([
    adminReads.listCategories(),
    adminReads.listCollections(),
  ]);
  return {
    categories: categories.map((c) => ({ value: c.id, label: c.name })),
    collections: collections.map((c) => ({ id: c.id, name: c.name })),
  };
}

export const listPublicCategories = () => catalogReads.listCategories();
