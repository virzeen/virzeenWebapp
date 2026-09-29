import "server-only";
import { db } from "@virzeen/db";
import { parseSizeChart, type AdminProductStatus, type SizeGuideInput } from "@virzeen/validators";
import { sizeGuideSelect, toProductSizeGuide, type ProductSizeGuide } from "../catalog/catalog.reads";
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
        benefits: true,
        details: true,
        countryOfOrigin: true,
        seoDescription: true,
        categoryId: true,
        sizeGuide: { select: { id: true, archivedAt: true } },
        isPublished: true,
        shippingPaisa: true,
        // The editor reloads its fields when this changes (after a save).
        updatedAt: true,
        collections: { select: { id: true } },
        images: { select: { url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
        features: {
          select: { title: true, body: true, imageUrl: true, imageAlt: true },
          orderBy: { sortOrder: "asc" },
        },
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
    const { sizeGuide, features, ...rest } = product;
    return {
      ...rest,
      countryOfOrigin: product.countryOfOrigin ?? "",
      // An archived guide can't be picked again, so the select starts at "No size guide".
      sizeGuideId: sizeGuide && !sizeGuide.archivedAt ? sizeGuide.id : "",
      images: product.images.map((image) => ({ ...image, color: image.color ?? "" })),
      features: features.map(({ imageAlt, ...feature }) => ({ ...feature, alt: imageAlt })),
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

  /** Size guides for the admin list: name, how many products (not archived) use each, last change. */
  async listSizeGuides() {
    const guides = await db.sizeGuide.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: { select: { products: { where: { archivedAt: null } } } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return guides.map(({ _count, ...guide }) => ({ ...guide, productCount: _count.products }));
  },

  /** A size guide as the edit form's values (blank strings for empty fields); null when missing or archived. */
  async getSizeGuideForEdit(id: string): Promise<(SizeGuideInput & { id: string }) | null> {
    const guide = await db.sizeGuide.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        name: true,
        intro: true,
        chart: true,
        fitTips: true,
        howToMeasure: true,
        imageUrl: true,
        imageAlt: true,
      },
    });
    if (!guide) return null;
    return {
      id: guide.id,
      name: guide.name,
      intro: guide.intro ?? "",
      // A stored chart that isn't valid starts again empty rather than breaking the form.
      chart: parseSizeChart(guide.chart) ?? { columns: [], rows: [] },
      fitTips: guide.fitTips ?? "",
      howToMeasure: guide.howToMeasure,
      imageUrl: guide.imageUrl ?? "",
      imageAlt: guide.imageAlt ?? "",
    };
  },

  /**
   * Size guides the product editor can pick, with everything its preview shows in the Size guide popup.
   * Guides whose stored chart isn't valid are left out (the shop hides them too).
   */
  async listSizeGuideOptions(): Promise<(ProductSizeGuide & { id: string })[]> {
    const guides = await db.sizeGuide.findMany({
      where: { archivedAt: null },
      select: { id: true, ...sizeGuideSelect },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return guides.flatMap((guide) => {
      const shown = toProductSizeGuide(guide);
      return shown ? [{ id: guide.id, ...shown }] : [];
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
