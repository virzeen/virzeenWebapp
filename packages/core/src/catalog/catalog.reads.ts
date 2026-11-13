import "server-only";
import { db, type Prisma } from "@virzeen/db";
import {
  parseFeatureRows,
  parseSizeChart,
  sortSizes,
  type ShopFilters,
  type SizeChart,
  type SizeGuideKind,
} from "@virzeen/validators";
import { stylesForShop } from "./product-styles";
import { searchWhere } from "./search";

// Read models shared by web queries and /api/v1 (docs/backend/api-contract.md "Shapes").

export const PAGE_SIZE = 12;

/**
 * What a shopper may see (specs/member-perks.md, early access): published, not archived, and public: a product with a
 * `publicAt` still in the future is hidden unless `earlyHours` (12 for a MONO Member, 48 for the Pass) brings it in range.
 * Uses the top-level `OR` (the shop's search uses `AND`).
 */
export function visibleProductWhere(earlyHours = 0, now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    isPublished: true,
    archivedAt: null,
    category: { archivedAt: null },
    OR: [{ publicAt: null }, { publicAt: { lte: new Date(now.getTime() + earlyHours * 3_600_000) } }],
  };
}

/**
 * A collection a shopper may see: early access works like a product's (specs/member-perks.md). A collection with a
 * public time in the future is hidden unless `earlyHours` brings it in range.
 */
function collectionVisible(earlyHours: number, now: Date = new Date()): Prisma.CollectionWhereInput {
  return {
    OR: [{ publicAt: null }, { publicAt: { lte: new Date(now.getTime() + earlyHours * 3_600_000) } }],
  };
}

/** The public rule, with the time read each time it is spread into a query (a getter, so it is never stale). */
export const publishedProductWhere = {
  isPublished: true,
  archivedAt: null,
  category: { archivedAt: null },
  get OR(): Prisma.ProductWhereInput[] {
    return [{ publicAt: null }, { publicAt: { lte: new Date() } }];
  },
} satisfies Prisma.ProductWhereInput;

export const summarySelect = {
  id: true,
  slug: true,
  name: true,
  fromPricePaisa: true,
  publishedAt: true,
  category: { select: { name: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 2 },
  variants: {
    where: { isActive: true },
    select: { stock: true, color: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
  // Photos tied to a style: the card then says "{n} styles" instead of "{n} colours".
  _count: { select: { images: { where: { color: { not: null } } } } },
} satisfies Prisma.ProductSelect;

export type SummaryRow = Prisma.ProductGetPayload<{ select: typeof summarySelect }>;

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  fromPricePaisa: number;
  imageUrl: string | null;
  imageAlt: string;
  hoverImageUrl: string | null;
  inStock: boolean;
  colorCount: number;
  /** The colours are styles with their own photos (specs/product-styles.md). */
  hasStylePhotos: boolean;
  /** The style names for sale in style order, as the product page lists them; [] without styles. */
  styles: string[];
  /** The card's grey line when the product has fewer than two styles (Nike's subtitle). */
  categoryName: string;
};

export function toSummary(row: SummaryRow): ProductSummary {
  const [first, second] = row.images;
  const styles = [...new Set(row.variants.flatMap((v) => (v.color ? [v.color] : [])))];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    fromPricePaisa: row.fromPricePaisa,
    imageUrl: first?.url ?? null,
    imageAlt: first?.alt ?? row.name,
    hoverImageUrl: second?.url ?? null,
    inStock: row.variants.some((v) => v.stock > 0),
    colorCount: styles.length,
    hasStylePhotos: row._count.images > 0,
    styles,
    categoryName: row.category.name,
  };
}

export type ProductPage = { items: ProductSummary[]; nextCursor: string | null };

/**
 * The two carousels under a product (specs/product-page-v2.md): "You may also like" (same category, without the
 * product) and "More from Virzeen" (other categories). Each is newest first; an empty one is hidden.
 */
export type ProductRecommendations = { sameCategory: ProductSummary[]; otherCategories: ProductSummary[] };

/**
 * The size guide a product page shows in its "Size guide" popup (specs/size-guides.md, specs/product-page-v2.md).
 * CHART (Clothing): `chart` is the size table in cm; `imageUrl` is the optional how-to-measure picture.
 * PICTURE (Accessories): `chart` is null; `imageUrl` is the size chart picture (never null).
 */
export type ProductSizeGuide = {
  kind: SizeGuideKind;
  name: string;
  intro: string | null;
  chart: SizeChart | null;
  fitTips: string | null;
  howToMeasure: string[];
  imageUrl: string | null;
  imageAlt: string | null;
};

/**
 * A stored guide as the shop shows it: null when there is none, it's archived, a CHART guide's chart isn't valid, or
 * a PICTURE guide has no picture.
 */
export function toProductSizeGuide(
  guide: (Omit<ProductSizeGuide, "chart"> & { chart: unknown; archivedAt?: Date | null }) | null,
): ProductSizeGuide | null {
  if (!guide || guide.archivedAt) return null;
  const shown = {
    kind: guide.kind,
    name: guide.name,
    intro: guide.intro,
    fitTips: guide.fitTips,
    howToMeasure: guide.howToMeasure,
    imageUrl: guide.imageUrl,
    imageAlt: guide.imageAlt,
  };
  if (guide.kind === "PICTURE") return guide.imageUrl ? { ...shown, chart: null } : null;
  const chart = parseSizeChart(guide.chart);
  return chart ? { ...shown, chart } : null;
}

/** The SizeGuide columns toProductSizeGuide needs. */
export const sizeGuideSelect = {
  kind: true,
  name: true,
  intro: true,
  chart: true,
  fitTips: true,
  howToMeasure: true,
  imageUrl: true,
  imageAlt: true,
  archivedAt: true,
} satisfies Prisma.SizeGuideSelect;

function orderFor(sort: ShopFilters["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ fromPricePaisa: "asc" }, { id: "asc" }];
    case "price-desc":
      return [{ fromPricePaisa: "desc" }, { id: "asc" }];
    default:
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  }
}

/** The shop listing's `where`: published, for sale, and matching the filters and search (cursor and sort aside). */
function listingWhere(filters: ShopFilters, earlyHours = 0): Prisma.ProductWhereInput {
  const variantFilter: Prisma.ProductVariantWhereInput = {
    isActive: true,
    ...(filters.size ? { size: filters.size } : {}),
    ...(filters.color ? { color: filters.color } : {}),
    ...(filters.inStock ? { stock: { gt: 0 } } : {}),
  };
  const hasVariantFilter = Boolean(filters.size || filters.color || filters.inStock);
  const search = filters.q ? searchWhere(filters.q) : null;
  return {
    ...visibleProductWhere(earlyHours),
    ...search,
    ...(filters.category ? { category: { slug: filters.category, archivedAt: null } } : {}),
    ...(filters.collection ? { collections: { some: { slug: filters.collection, archivedAt: null } } } : {}),
    variants: { some: hasVariantFilter ? variantFilter : { isActive: true } },
  };
}

export const catalogReads = {
  /** How many products the listing holds in all (the "Shop (12)" title), whatever "Load more" has shown. */
  countProducts(filters: ShopFilters, earlyHours = 0): Promise<number> {
    return db.product.count({ where: listingWhere(filters, earlyHours) });
  },

  /** Shop listing with filters, the search query (specs/search.md) and cursor pagination ("Load more"). */
  async listProducts(filters: ShopFilters, limit = PAGE_SIZE, earlyHours = 0): Promise<ProductPage> {
    const rows = await db.product.findMany({
      where: listingWhere(filters, earlyHours),
      select: summarySelect,
      orderBy: orderFor(filters.sort),
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit).map(toSummary);
    return { items: page, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null };
  },

  async listByIds(ids: readonly string[], earlyHours = 0): Promise<ProductSummary[]> {
    if (ids.length === 0) return [];
    const rows = await db.product.findMany({
      where: { ...visibleProductWhere(earlyHours), id: { in: [...ids] } },
      select: summarySelect,
    });
    const byId = new Map(rows.map((row) => [row.id, toSummary(row)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },

  /**
   * The products a member can already see and buy that the public can't yet (early access, specs/member-perks.md):
   * public within `earlyHours` from now, soonest first.
   */
  async listEarlyAccess(earlyHours: number, limit = 3, now: Date = new Date()) {
    if (earlyHours <= 0) return [];
    return db.product.findMany({
      where: {
        isPublished: true,
        archivedAt: null,
        category: { archivedAt: null },
        variants: { some: { isActive: true } },
        publicAt: { gt: now, lte: new Date(now.getTime() + earlyHours * 3_600_000) },
      },
      select: { slug: true, name: true, publicAt: true },
      orderBy: { publicAt: "asc" },
      take: limit,
    });
  },

  async listNewArrivals(limit = 8, earlyHours = 0): Promise<ProductSummary[]> {
    const rows = await db.product.findMany({
      where: { ...visibleProductWhere(earlyHours), variants: { some: { isActive: true } } },
      select: summarySelect,
      orderBy: orderFor("newest"),
      take: limit,
    });
    return rows.map(toSummary);
  },

  async getProductBySlug(slug: string, earlyHours = 0) {
    const row = await db.product.findFirst({
      where: { ...visibleProductWhere(earlyHours), slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        care: true,
        benefits: true,
        details: true,
        countryOfOrigin: true,
        seoDescription: true,
        fromPricePaisa: true,
        categoryId: true,
        category: { select: { slug: true, name: true } },
        images: { select: { id: true, url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
        features: {
          select: { id: true, title: true, body: true, imageUrl: true, imageAlt: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        featureLayout: true,
        featureRows: true,
        sizeGuide: { select: sizeGuideSelect },
        variants: {
          where: { isActive: true },
          select: { id: true, sku: true, size: true, color: true, pricePaisa: true, stock: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        styles: { select: { color: true, code: true, colourShown: true } },
      },
    });
    if (!row || row.variants.length === 0) return null;
    const colors = [...new Set(row.variants.flatMap((v) => (v.color ? [v.color] : [])))];
    return {
      ...row,
      /** The Custom layout's rows (specs/product-page-v2.md); [] when there are none or they can't be read. */
      featureRows: parseFeatureRows(row.featureRows),
      sizeGuide: toProductSizeGuide(row.sizeGuide),
      inStock: row.variants.some((v) => v.stock > 0),
      sizes: sortSizes(row.variants.flatMap((v) => (v.size ? [v.size] : []))),
      colors,
      /**
       * Style numbers and "Colour shown" for the product's colours in style order, or the one style ("") of a
       * product without colours (specs/product-editor-on-page.md). colourShown falls back to the colour.
       */
      styles: stylesForShop(colors, row.styles),
    };
  },

  /** "You may also like": published products of a category (newest first), without `excludeId`. */
  async listRelatedByCategory({
    categoryId,
    excludeId,
    limit = 4,
    earlyHours = 0,
  }: {
    categoryId: string;
    excludeId?: string | undefined;
    limit?: number;
    earlyHours?: number;
  }): Promise<ProductSummary[]> {
    const rows = await db.product.findMany({
      where: {
        ...visibleProductWhere(earlyHours),
        categoryId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        variants: { some: { isActive: true } },
      },
      select: summarySelect,
      orderBy: orderFor("newest"),
      take: limit,
    });
    return rows.map(toSummary);
  },

  /**
   * The carousels under a product (specs/product-page-v2.md): up to `limit` published products of the category
   * without `excludeId` ("You may also like"), and up to `limit` of the other categories ("More from Virzeen"), both
   * newest first and only with a variant for sale.
   */
  async listRecommendations({
    categoryId,
    excludeId,
    limit = 8,
    earlyHours = 0,
  }: {
    categoryId: string;
    excludeId?: string | undefined;
    limit?: number;
    earlyHours?: number;
  }): Promise<ProductRecommendations> {
    const [sameCategory, otherRows] = await Promise.all([
      catalogReads.listRelatedByCategory({ categoryId, excludeId, limit, earlyHours }),
      db.product.findMany({
        where: {
          ...visibleProductWhere(earlyHours),
          categoryId: { not: categoryId },
          ...(excludeId ? { id: { not: excludeId } } : {}),
          variants: { some: { isActive: true } },
        },
        select: summarySelect,
        orderBy: orderFor("newest"),
        take: limit,
      }),
    ]);
    return { sameCategory, otherCategories: otherRows.map(toSummary) };
  },

  async listRelated(product: { id: string; categoryId: string }, limit = 4): Promise<ProductSummary[]> {
    return catalogReads.listRelatedByCategory({
      categoryId: product.categoryId,
      excludeId: product.id,
      limit,
    });
  },

  async listCategories() {
    return db.category.findMany({
      where: { archivedAt: null, products: { some: publishedProductWhere } },
      select: { id: true, slug: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  async getCategoryBySlug(slug: string) {
    return db.category.findFirst({
      where: { slug, archivedAt: null },
      select: { id: true, slug: true, name: true },
    });
  },

  /** Whether a collection is live in the shop (not archived, with a published product): the header's "Sale" link. */
  async hasLiveCollection(slug: string, earlyHours = 0): Promise<boolean> {
    const count = await db.collection.count({
      where: {
        slug,
        archivedAt: null,
        ...collectionVisible(earlyHours),
        products: { some: publishedProductWhere },
      },
    });
    return count > 0;
  },

  async listCollections(options: { featuredOnly?: boolean; earlyHours?: number } = {}) {
    return db.collection.findMany({
      where: {
        archivedAt: null,
        ...collectionVisible(options.earlyHours ?? 0),
        ...(options.featuredOnly ? { isFeatured: true } : {}),
        products: { some: publishedProductWhere },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        products: {
          where: publishedProductWhere,
          select: { images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
          orderBy: { publishedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getCollectionBySlug(slug: string, earlyHours = 0) {
    return db.collection.findFirst({
      where: { slug, archivedAt: null, ...collectionVisible(earlyHours) },
      select: { id: true, slug: true, name: true, description: true },
    });
  },

  /** Sizes and colours present in the (optionally filtered) catalogue, for the filter controls. */
  async getFilterOptions(scope: { category?: string | undefined; collection?: string | undefined }) {
    const variants = await db.productVariant.findMany({
      where: {
        isActive: true,
        product: {
          ...publishedProductWhere,
          ...(scope.category ? { category: { slug: scope.category } } : {}),
          ...(scope.collection ? { collections: { some: { slug: scope.collection } } } : {}),
        },
      },
      select: { size: true, color: true },
      distinct: ["size", "color"],
    });
    return {
      sizes: sortSizes(variants.flatMap((v) => (v.size ? [v.size] : []))),
      colors: [...new Set(variants.flatMap((v) => (v.color ? [v.color] : [])))].sort(),
    };
  },

  /** Everything the sitemap needs. */
  async listSitemapEntries() {
    const [products, categories, collections, projects] = await Promise.all([
      db.product.findMany({ where: publishedProductWhere, select: { slug: true, updatedAt: true } }),
      db.category.findMany({ where: { archivedAt: null }, select: { slug: true, updatedAt: true } }),
      db.collection.findMany({ where: { archivedAt: null }, select: { slug: true, updatedAt: true } }),
      db.portfolioProject.findMany({
        where: { isPublished: true, archivedAt: null },
        select: { slug: true, updatedAt: true },
      }),
    ]);
    return { products, categories, collections, projects };
  },
};

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof catalogReads.getProductBySlug>>>;
