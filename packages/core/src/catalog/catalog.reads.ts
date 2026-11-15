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
import { EARLY_ACCESS_HOURS } from "@virzeen/validators/limits";
import { levelOf } from "@virzeen/validators/membership";
import { stylesForShop } from "./product-styles";
import { searchWhere } from "./search";

// Read models shared by web queries and /api/v1 (docs/backend/api-contract.md "Shapes").

export const PAGE_SIZE = 12;

/**
 * Whether a viewer is a Monochrome Pass member, read from their early-access hours, which already say who they are:
 * 0 a visitor, 12 a MONO Member, 48 the Pass (`EARLY_ACCESS_HOURS`, which a test keeps strictly increasing). Only the
 * Pass may buy members-only products (specs/catalog-groups-visibility.md); a MONO Member is a public shopper.
 */
export function isPassViewer(earlyHours: number): boolean {
  return earlyHours >= EARLY_ACCESS_HOURS.PASS;
}

/**
 * A members-only product: set to the Monochrome Pass itself, or in no public collection (every live collection it is in
 * is Pass-only). Everyone sees it, in the "For Members only" row; only the Pass may buy it.
 */
export const membersOnlyWhere: Prisma.ProductWhereInput = {
  OR: [{ audience: "PASS" }, { collections: { none: { audience: "PUBLIC", archivedAt: null } } }],
};

/** The same rule for a product row read with `audience` and its collections' `audience` and `archivedAt`. */
export function isMembersOnly(row: {
  audience: "PUBLIC" | "PASS";
  collections: { audience: "PUBLIC" | "PASS"; archivedAt: Date | null }[];
}): boolean {
  return row.audience === "PASS" || !row.collections.some((c) => c.audience === "PUBLIC" && !c.archivedAt);
}

/**
 * The early-access hours of a signed-in customer (a MONO Member 12, a running Pass 48; an expired Pass is a member
 * again), for the services that know a userId and need the same view of the shop as their pages.
 */
export async function earlyHoursFor(userId: string): Promise<number> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passEndsAt: true } });
  return EARLY_ACCESS_HOURS[levelOf(user?.passEndsAt) === "PASS" ? "PASS" : "MEMBER"];
}

/**
 * A collection a shopper may see: not archived, and early access works as for a product (specs/member-perks.md): one
 * with a public time in the future is hidden unless `earlyHours` brings it in range. Its Public / Pass level does not
 * hide it: it decides who may buy what is in it.
 */
export function collectionVisible(earlyHours: number, now: Date = new Date()): Prisma.CollectionWhereInput {
  return {
    archivedAt: null,
    OR: [{ publicAt: null }, { publicAt: { lte: new Date(now.getTime() + earlyHours * 3_600_000) } }],
  };
}

/**
 * What a shopper may see: published, not archived, in a live main collection, and in at least one collection they may
 * see (specs/catalog-groups-visibility.md). A product with a `publicAt` still in the future is hidden unless
 * `earlyHours` (12 for a MONO Member, 48 for the Pass) brings it in range. Members-only products are seen by everyone
 * (locked); `buyableProductWhere` adds who may buy. This is the one rule every shopper-facing read uses; the keys are
 * `NOT` and the top-level `OR`, so spreading it next to a filter on `collections` or `AND` (the shop's search) keeps
 * them all. Never used for orders, payments, emails, reviews or admin.
 */
export function visibleProductWhere(earlyHours = 0, now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    isPublished: true,
    archivedAt: null,
    mainCollection: { archivedAt: null },
    NOT: { collections: { none: collectionVisible(earlyHours, now) } },
    OR: [{ publicAt: null }, { publicAt: { lte: new Date(now.getTime() + earlyHours * 3_600_000) } }],
  };
}

/**
 * What a shopper may put in the bag and buy: what they may see, except members-only products unless they are on the
 * Pass. Uses `AND`, so spread it on its own (the bag, checkout).
 */
export function buyableProductWhere(earlyHours = 0, now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    AND: [
      visibleProductWhere(earlyHours, now),
      ...(isPassViewer(earlyHours) ? [] : [{ NOT: membersOnlyWhere }]),
    ],
  };
}

/** The most tiles the home page's "Virzeen Archive's" section shows (two rows of eight, like Nike's Spotlight). */
export const HOME_TILES_SHOWN = 16;

/** One tile of that section: a collection, drawn with an icon. */
export type HomeTile = {
  key: string;
  slug: string;
  name: string;
  href: string;
};

/**
 * A product that is live (published, not archived, its main collection live, public time passed) whoever it is
 * for. For jobs and other places that add the viewer's own check; what a shopper may see is `visibleProductWhere`.
 */
export const publishedProductWhere = {
  isPublished: true,
  archivedAt: null,
  mainCollection: { archivedAt: null },
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
  mainCollection: { select: { name: true } },
  audience: true,
  collections: { select: { audience: true, archivedAt: true } },
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
  /** The card's grey line when the product has fewer than two styles (Nike's subtitle): its main collection. */
  collectionName: string;
  /** In the "For Members only" row: everyone sees it, only Monochrome Pass members may buy it. */
  membersOnly: boolean;
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
    collectionName: row.mainCollection.name,
    membersOnly: isMembersOnly(row),
  };
}

export type ProductPage = { items: ProductSummary[]; nextCursor: string | null };

/**
 * The two carousels under a product (specs/product-page-v2.md): "You may also like" (same main collection, without the
 * product) and "More from Virzeen" (other collections). Each is newest first; an empty one is hidden.
 */
export type ProductRecommendations = { sameCollection: ProductSummary[]; otherCollections: ProductSummary[] };

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
function listingWhere(
  filters: ShopFilters,
  earlyHours = 0,
  members?: "only" | "exclude",
): Prisma.ProductWhereInput {
  const variantFilter: Prisma.ProductVariantWhereInput = {
    isActive: true,
    ...(filters.size ? { size: filters.size } : {}),
    ...(filters.color ? { color: filters.color } : {}),
    ...(filters.inStock ? { stock: { gt: 0 } } : {}),
  };
  const hasVariantFilter = Boolean(filters.size || filters.color || filters.inStock);
  const search = filters.q ? searchWhere(filters.q, collectionVisible(earlyHours)) : null;
  const where: Prisma.ProductWhereInput = {
    ...visibleProductWhere(earlyHours),
    ...search,
    ...(filters.collection ? { collections: { some: { slug: filters.collection, archivedAt: null } } } : {}),
    variants: { some: hasVariantFilter ? variantFilter : { isActive: true } },
  };
  if (!members) return where;
  // The "For Members only" row holds the members-only products; the grid above it holds the rest.
  return { AND: [where, members === "only" ? membersOnlyWhere : { NOT: membersOnlyWhere }] };
}

export const catalogReads = {
  /** How many products the listing holds in all (the "Shop (12)" title), whatever "Load more" has shown. */
  countProducts(filters: ShopFilters, earlyHours = 0, members?: "only" | "exclude"): Promise<number> {
    return db.product.count({ where: listingWhere(filters, earlyHours, members) });
  },

  /** Shop listing with filters, the search query (specs/search.md) and cursor pagination ("Load more"). */
  async listProducts(
    filters: ShopFilters,
    limit = PAGE_SIZE,
    earlyHours = 0,
    members?: "only" | "exclude",
  ): Promise<ProductPage> {
    const rows = await db.product.findMany({
      where: listingWhere(filters, earlyHours, members),
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
        ...visibleProductWhere(earlyHours, now),
        variants: { some: { isActive: true } },
        // Still in the future for the public (the member's window brings it in through visibleProductWhere).
        publicAt: { gt: now },
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
        mainCollectionId: true,
        mainCollection: { select: { slug: true, name: true } },
        audience: true,
        collections: { select: { audience: true, archivedAt: true } },
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
    const { audience, collections, ...product } = row;
    const colors = [...new Set(row.variants.flatMap((v) => (v.color ? [v.color] : [])))];
    return {
      ...product,
      /** Everyone sees it; only Monochrome Pass members may buy it (specs/catalog-groups-visibility.md). */
      membersOnly: isMembersOnly({ audience, collections }),
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

  /** "You may also like": published products with the same main collection (newest first), without `excludeId`. */
  async listRelatedByCollection({
    collectionId,
    excludeId,
    limit = 4,
    earlyHours = 0,
  }: {
    collectionId: string;
    excludeId?: string | undefined;
    limit?: number;
    earlyHours?: number;
  }): Promise<ProductSummary[]> {
    const rows = await db.product.findMany({
      where: {
        ...visibleProductWhere(earlyHours),
        mainCollectionId: collectionId,
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
   * The carousels under a product (specs/product-page-v2.md): up to `limit` published products with the same main
   * collection, without `excludeId` ("You may also like"), and up to `limit` of the other collections ("More from
   * Virzeen"), both newest first and only with a variant for sale.
   */
  async listRecommendations({
    collectionId,
    excludeId,
    limit = 8,
    earlyHours = 0,
  }: {
    collectionId: string;
    excludeId?: string | undefined;
    limit?: number;
    earlyHours?: number;
  }): Promise<ProductRecommendations> {
    const [sameCollection, otherRows] = await Promise.all([
      catalogReads.listRelatedByCollection({ collectionId, excludeId, limit, earlyHours }),
      db.product.findMany({
        where: {
          ...visibleProductWhere(earlyHours),
          mainCollectionId: { not: collectionId },
          ...(excludeId ? { id: { not: excludeId } } : {}),
          variants: { some: { isActive: true } },
        },
        select: summarySelect,
        orderBy: orderFor("newest"),
        take: limit,
      }),
    ]);
    return { sameCollection, otherCollections: otherRows.map(toSummary) };
  },

  async listRelated(product: { id: string; mainCollectionId: string }, limit = 4): Promise<ProductSummary[]> {
    return catalogReads.listRelatedByCollection({
      collectionId: product.mainCollectionId,
      excludeId: product.id,
      limit,
    });
  },

  /**
   * Every collection a shopper may see, in the shop's menu and filter (specs/catalog-groups-visibility.md): live, with
   * at least one product they can see, ordered by Order then name.
   */
  async listShopCollections(earlyHours = 0) {
    return db.collection.findMany({
      where: {
        ...collectionVisible(earlyHours),
        products: { some: visibleProductWhere(earlyHours) },
      },
      select: { id: true, slug: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  /** Whether a collection is live in the shop (not archived, with a published product): the header's "Sale" link. */
  async hasLiveCollection(slug: string, earlyHours = 0): Promise<boolean> {
    const count = await db.collection.count({
      where: {
        slug,
        ...collectionVisible(earlyHours),
        products: { some: visibleProductWhere(earlyHours) },
      },
    });
    return count > 0;
  },

  async listCollections(options: { featuredOnly?: boolean; earlyHours?: number } = {}) {
    return db.collection.findMany({
      where: {
        ...collectionVisible(options.earlyHours ?? 0),
        ...(options.featuredOnly ? { isFeatured: true } : {}),
        products: { some: visibleProductWhere(options.earlyHours ?? 0) },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        products: {
          where: visibleProductWhere(options.earlyHours ?? 0),
          select: { images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
          orderBy: { publishedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * The tiles of the home page's "Virzeen Archive's" section (specs/home-archive.md): every live collection the viewer
   * may see (early access works as in the shop), ordered by Order then name. One with nothing visible is left out.
   */
  async listHomeTiles(earlyHours = 0, limit = HOME_TILES_SHOWN): Promise<HomeTile[]> {
    const collections = await catalogReads.listShopCollections(earlyHours);
    return collections.slice(0, limit).map((row): HomeTile => ({
      key: `collection-${row.id}`,
      slug: row.slug,
      name: row.name,
      href: `/collections/${row.slug}`,
    }));
  },

  async getCollectionBySlug(slug: string, earlyHours = 0) {
    return db.collection.findFirst({
      where: { slug, ...collectionVisible(earlyHours) },
      select: { id: true, slug: true, name: true, description: true },
    });
  },

  /** Sizes and colours present in the (optionally filtered) catalogue, for the filter controls. */
  async getFilterOptions(scope: { collection?: string | undefined }, earlyHours = 0) {
    const variants = await db.productVariant.findMany({
      where: {
        isActive: true,
        product: {
          ...visibleProductWhere(earlyHours),
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
    const [products, collections, projects] = await Promise.all([
      // What a visitor may see: search engines never learn of a members-only product or collection.
      db.product.findMany({ where: visibleProductWhere(0), select: { slug: true, updatedAt: true } }),
      db.collection.findMany({ where: collectionVisible(0), select: { slug: true, updatedAt: true } }),
      db.portfolioProject.findMany({
        where: { isPublished: true, archivedAt: null },
        select: { slug: true, updatedAt: true },
      }),
    ]);
    return { products, collections, projects };
  },
};

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof catalogReads.getProductBySlug>>>;
