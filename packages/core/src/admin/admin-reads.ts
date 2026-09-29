import "server-only";
import { db, type Prisma } from "@virzeen/db";
import {
  parseSizeChart,
  type AdminProductStatus,
  type ProductInput,
  type SizeGuideInput,
} from "@virzeen/validators";
import { sizeGuideSelect, toProductSizeGuide, type ProductSizeGuide } from "../catalog/catalog.reads";
import { styleColors } from "../catalog/product-styles";
import { AppError } from "../errors";

// Read models for admin screens (admin actions live in the domain services).

/** New products (and copies without one) start with "China" (owner, 2026-09-29: specs/product-editor-on-page.md). */
export const DEFAULT_COUNTRY_OF_ORIGIN = "China";

/**
 * A saved product as the product editor's values (a ProductInput with blanks for empty fields): variant ids and SKUs,
 * the photo descriptions saved (made ones included), and each style's number (`code`) and colour shown ("" = its
 * name). Sending these back to saveProduct changes nothing.
 */
export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  care: string;
  benefits: string[];
  details: string[];
  countryOfOrigin: string;
  seoDescription: string;
  categoryId: string;
  sizeGuideId: string;
  collectionIds: string[];
  isPublished: boolean;
  images: { url: string; alt: string; color: string }[];
  features: { title: string; body: string; imageUrl: string; alt: string }[];
  /** In style order: the variant colours in row order, or one style "" for a product without colours. */
  styles: { color: string; colourShown: string; code: string }[];
  shippingPaisa: number;
  /** Every variant, for sale or not; `pricePaisa` is the product price before shipping. */
  variants: {
    id: string;
    sku: string;
    size: string;
    color: string;
    pricePaisa: number;
    stock: number;
    isActive: boolean;
  }[];
};

/**
 * The product editor's read of one product (adminReads.getProductForEdit); catalogService.saveProduct reads it
 * inside its transaction to hand the editor what it saved.
 */
export async function readProductForEdit(client: Prisma.TransactionClient, id: string) {
  const product = await client.product.findFirst({
    where: { id, archivedAt: null },
    select: {
      id: true,
      number: true,
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
      // Kept after Unpublish: the editor stops making the slug from the name once a product has been published.
      publishedAt: true,
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
      styles: { select: { color: true, code: true, colourShown: true } },
    },
  });
  if (!product) throw new AppError("NOT_FOUND", "Product not found.");
  const { sizeGuide, features, styles: styleRows, ...rest } = product;
  // What the shop shows: every product was set to China and new ones start with it, so a blank one was cleared on
  // purpose (the editor must not show "China" where the product page shows no origin).
  const countryOfOrigin = product.countryOfOrigin ?? "";
  // An archived guide can't be picked again, so the select starts at "No size guide".
  const sizeGuideId = sizeGuide && !sizeGuide.archivedAt ? sizeGuide.id : "";
  const images = product.images.map((image) => ({ ...image, color: image.color ?? "" }));
  const featureValues = features.map(({ imageAlt, ...feature }) => ({ ...feature, alt: imageAlt }));
  // The form edits the product price before shipping (catalogService.saveProduct adds it back).
  const variants = product.variants.map((v) => ({ ...v, pricePaisa: v.pricePaisa - product.shippingPaisa }));
  const styles = styleColors(product.variants).map((color) => {
    const row = styleRows.find((candidate) => candidate.color === color);
    return { color, colourShown: row?.colourShown ?? "", code: row?.code ?? "" };
  });
  const values: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    description: product.description,
    care: product.care ?? "",
    benefits: product.benefits,
    details: product.details,
    countryOfOrigin,
    seoDescription: product.seoDescription ?? "",
    categoryId: product.categoryId,
    sizeGuideId,
    collectionIds: product.collections.map((collection) => collection.id),
    isPublished: product.isPublished,
    images,
    features: featureValues,
    styles,
    shippingPaisa: product.shippingPaisa,
    variants: variants.map((v) => ({ ...v, size: v.size ?? "", color: v.color ?? "" })),
  };
  return {
    ...rest,
    countryOfOrigin,
    sizeGuideId,
    images,
    features: featureValues,
    variants,
    styles,
    /** What the editor's form starts from (and what a save hands back). */
    values: values satisfies ProductInput,
  };
}

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

  /** One product for the editor: its fields, plus `values` (the form's values, ProductFormValues). */
  async getProductForEdit(id: string) {
    return readProductForEdit(db, id);
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
