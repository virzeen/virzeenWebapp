import "server-only";
import { db, type Prisma } from "@virzeen/db";
import { sortSizes, type ShopFilters } from "@virzeen/validators";

// Read models shared by web queries and /api/v1 (docs/backend/api-contract.md "Shapes").

export const PAGE_SIZE = 12;

export const publishedProductWhere = {
  isPublished: true,
  archivedAt: null,
  category: { archivedAt: null },
} satisfies Prisma.ProductWhereInput;

const summarySelect = {
  id: true,
  slug: true,
  name: true,
  fromPricePaisa: true,
  publishedAt: true,
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { where: { isActive: true }, select: { stock: true, color: true } },
  // Photos tied to a style: the card then says "{n} styles" instead of "{n} colours".
  _count: { select: { images: { where: { color: { not: null } } } } },
} satisfies Prisma.ProductSelect;

type SummaryRow = Prisma.ProductGetPayload<{ select: typeof summarySelect }>;

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
};

function toSummary(row: SummaryRow): ProductSummary {
  const [first, second] = row.images;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    fromPricePaisa: row.fromPricePaisa,
    imageUrl: first?.url ?? null,
    imageAlt: first?.alt ?? row.name,
    hoverImageUrl: second?.url ?? null,
    inStock: row.variants.some((v) => v.stock > 0),
    colorCount: new Set(row.variants.map((v) => v.color).filter(Boolean)).size,
    hasStylePhotos: row._count.images > 0,
  };
}

export type ProductPage = { items: ProductSummary[]; nextCursor: string | null };

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

export const catalogReads = {
  /** Shop listing with filters and cursor pagination ("Load more"). */
  async listProducts(filters: ShopFilters, limit = PAGE_SIZE): Promise<ProductPage> {
    const variantFilter: Prisma.ProductVariantWhereInput = {
      isActive: true,
      ...(filters.size ? { size: filters.size } : {}),
      ...(filters.color ? { color: filters.color } : {}),
      ...(filters.inStock ? { stock: { gt: 0 } } : {}),
    };
    const hasVariantFilter = Boolean(filters.size || filters.color || filters.inStock);
    const rows = await db.product.findMany({
      where: {
        ...publishedProductWhere,
        ...(filters.category ? { category: { slug: filters.category, archivedAt: null } } : {}),
        ...(filters.collection
          ? { collections: { some: { slug: filters.collection, archivedAt: null } } }
          : {}),
        variants: { some: hasVariantFilter ? variantFilter : { isActive: true } },
      },
      select: summarySelect,
      orderBy: orderFor(filters.sort),
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit).map(toSummary);
    return { items: page, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null };
  },

  async listByIds(ids: readonly string[]): Promise<ProductSummary[]> {
    if (ids.length === 0) return [];
    const rows = await db.product.findMany({
      where: { ...publishedProductWhere, id: { in: [...ids] } },
      select: summarySelect,
    });
    const byId = new Map(rows.map((row) => [row.id, toSummary(row)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },

  async listNewArrivals(limit = 8): Promise<ProductSummary[]> {
    const rows = await db.product.findMany({
      where: { ...publishedProductWhere, variants: { some: { isActive: true } } },
      select: summarySelect,
      orderBy: orderFor("newest"),
      take: limit,
    });
    return rows.map(toSummary);
  },

  async getProductBySlug(slug: string) {
    const row = await db.product.findFirst({
      where: { ...publishedProductWhere, slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        care: true,
        seoDescription: true,
        fromPricePaisa: true,
        categoryId: true,
        category: { select: { slug: true, name: true } },
        images: { select: { id: true, url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
        variants: {
          where: { isActive: true },
          select: { id: true, sku: true, size: true, color: true, pricePaisa: true, stock: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!row || row.variants.length === 0) return null;
    return {
      ...row,
      inStock: row.variants.some((v) => v.stock > 0),
      sizes: sortSizes(row.variants.flatMap((v) => (v.size ? [v.size] : []))),
      colors: [...new Set(row.variants.flatMap((v) => (v.color ? [v.color] : [])))],
    };
  },

  async listRelated(product: { id: string; categoryId: string }, limit = 4): Promise<ProductSummary[]> {
    const rows = await db.product.findMany({
      where: {
        ...publishedProductWhere,
        categoryId: product.categoryId,
        id: { not: product.id },
        variants: { some: { isActive: true } },
      },
      select: summarySelect,
      orderBy: orderFor("newest"),
      take: limit,
    });
    return rows.map(toSummary);
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

  async listCollections(options: { featuredOnly?: boolean } = {}) {
    return db.collection.findMany({
      where: {
        archivedAt: null,
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

  async getCollectionBySlug(slug: string) {
    return db.collection.findFirst({
      where: { slug, archivedAt: null },
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
