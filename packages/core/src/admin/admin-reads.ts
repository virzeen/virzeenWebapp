import "server-only";
import { db } from "@virzeen/db";
import type { AdminProductStatus } from "@virzeen/validators";
import { AppError } from "../errors";

// Read models for admin screens (admin actions live in the domain services).

export const adminReads = {
  async listProducts(query?: string, status?: AdminProductStatus) {
    return db.product.findMany({
      where: {
        archivedAt: null,
        ...(status ? { isPublished: status === "published" } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { slug: { contains: query.toLowerCase() } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
        fromPricePaisa: true,
        updatedAt: true,
        category: { select: { name: true } },
        images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { where: { isActive: true }, select: { stock: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  },

  /** Counts for the products list's All / Published / Drafts filters. */
  async productStatusCounts() {
    const groups = await db.product.groupBy({
      by: ["isPublished"],
      where: { archivedAt: null },
      _count: { _all: true },
    });
    const published = groups.find((group) => group.isPublished)?._count._all ?? 0;
    const draft = groups.find((group) => !group.isPublished)?._count._all ?? 0;
    return { all: published + draft, published, draft };
  },

  async getProductForEdit(id: string) {
    const product = await db.product.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        care: true,
        seoDescription: true,
        categoryId: true,
        isPublished: true,
        shippingPaisa: true,
        // The editor reloads its fields when this changes (after a save).
        updatedAt: true,
        collections: { select: { id: true } },
        images: { select: { url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
        // Variants not for sale too, so For sale can be ticked again (variants are never deleted).
        variants: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            pricePaisa: true,
            stock: true,
            isActive: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!product) throw new AppError("NOT_FOUND", "Product not found.");
    // The form edits the product price before shipping (catalogService.saveProduct adds it back).
    return {
      ...product,
      images: product.images.map((image) => ({ ...image, color: image.color ?? "" })),
      variants: product.variants.map((v) => ({ ...v, pricePaisa: v.pricePaisa - product.shippingPaisa })),
    };
  },

  async listCategories() {
    return db.category.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
        _count: { select: { products: { where: { archivedAt: null } } } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  async listCollections() {
    return db.collection.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isFeatured: true,
        _count: { select: { products: { where: { archivedAt: null } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Customers (read-only in phase 1). No addresses or phone numbers in the list. */
  async listCustomers(page = 1) {
    const take = 25;
    const [total, rows] = await Promise.all([
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.user.findMany({
        where: { role: "CUSTOMER" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
    ]);
    return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / take)) };
  },

  async listProductOptions() {
    return db.product.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },
};
