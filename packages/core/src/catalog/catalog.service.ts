import "server-only";
import { db, type Prisma } from "@virzeen/db";
import type {
  CategoryInput,
  CollectionInput,
  CreateDraftProductInput,
  ProductData,
  SizeGuideInput,
} from "@virzeen/validators";
import { DEFAULT_COUNTRY_OF_ORIGIN, readProductForEdit, type ProductFormValues } from "../admin/admin-reads";
import { recordAudit } from "../audit/audit";
import { AppError, isUniqueViolation } from "../errors";
import { moveFavouritesToRenamedStyles } from "../favourites/favourite.service";
import { saveStyles, styleColors } from "./product-styles";

const emptyToNull = (value: string | undefined) => (value && value.length > 0 ? value : null);

function conflictFrom(error: unknown, what: string): never {
  if (isUniqueViolation(error)) {
    throw new AppError("VALIDATION_FAILED", `This ${what} is already used.`, {
      fields:
        what === "SKU"
          ? { variants: "One of these SKUs is already used. Change it and save again." }
          : { slug: "This slug is already used" },
    });
  }
  throw error;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

type Tx = Prisma.TransactionClient;
type VariantData = ProductData["variants"][number];

/**
 * What a save hands back to the product editor (specs/product-editor-on-page.md): the product as the editor's values
 * right after the save (variant ids, made SKUs and photo descriptions, style numbers), so the next autosave updates
 * the same rows instead of adding them again. `savedAt` is the product's updatedAt (ISO).
 */
export type SavedProduct = { id: string; slug: string; savedAt: string; values: ProductFormValues };

/** A URL slug from a name: "Linen Shirt (Black)" → "linen-shirt-black"; "product" when nothing is left. */
function slugFrom(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 110)
    .replace(/-+$/, "");
  return slug || "product";
}

/** `base`, or `base`-2, -3… when another product (archived ones too) has it. */
async function freeSlug(base: string) {
  const used = new Set(
    (await db.product.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map(
      (row) => row.slug,
    ),
  );
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Letters and digits only, upper case, cut to `max` (SKU parts must match [A-Z0-9]+). */
const skuPart = (text: string | undefined, max: number) =>
  (text ?? "")
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, max);

/**
 * Blank SKUs become VZ-<PRODUCT>-<COLOUR>-<SIZE> (VZ-<PRODUCT>-STD with neither), with -2, -3… when another
 * variant already has it. A SKU of this product's own variant that isn't in the form doesn't count as taken, so the
 * made SKU brings that variant back (see saveProduct) instead of leaving it switched off next to a copy.
 */
async function fillBlankSkus(tx: Tx, productId: string | null, slug: string, variants: VariantData[]) {
  if (variants.every((variant) => variant.sku)) return variants;
  const prefix = `VZ-${skuPart(slug, 12)}`;
  const keptIds = new Set(variants.flatMap((variant) => (variant.id ? [variant.id] : [])));
  const inUse = await tx.productVariant.findMany({
    where: { sku: { startsWith: prefix } },
    select: { id: true, sku: true, productId: true },
  });
  const taken = new Set([
    ...inUse.filter((row) => row.productId !== productId || keptIds.has(row.id)).map((row) => row.sku),
    ...variants.map((variant) => variant.sku).filter(Boolean),
  ]);
  return variants.map((variant) => {
    if (variant.sku) return variant;
    const parts = [skuPart(variant.color, 8), skuPart(variant.size, 8)].filter(Boolean);
    const base = [prefix, ...(parts.length > 0 ? parts : ["STD"])].join("-");
    let sku = base;
    for (let n = 2; taken.has(sku); n++) sku = `${base}-${n}`;
    taken.add(sku);
    return { ...variant, sku };
  });
}

type ImageData = ProductData["images"][number];

/** What a blank feature picture description becomes: "{product}, {feature title}". */
const featureAlt = (name: string, title: string) => `${name}, ${title}`;

/**
 * Photos in shop order: each style's photos in the order of its variants, then the photos shared by every style
 * (specs/product-styles.md). The first photo is the product card's picture, so it's the first style's main photo.
 */
function inShopOrder(images: readonly ImageData[], variants: readonly VariantData[]) {
  const styles = [...new Set(variants.map((variant) => variant.color?.trim() ?? "").filter(Boolean))];
  const rank = (image: ImageData) => {
    const index = styles.indexOf(image.color?.trim() ?? "");
    return index === -1 ? styles.length : index;
  };
  return images
    .map((image, index) => ({ image, index }))
    .sort((a, b) => rank(a.image) - rank(b.image) || a.index - b.index)
    .map(({ image }) => image);
}

/**
 * What a blank photo description becomes: the product name, plus the style for a style's photos, plus "photo n"
 * from the second photo of each group on ("Oversized Tee, Mountain print, photo 2").
 */
function defaultAlts(name: string, images: readonly { color?: string | null }[]) {
  const seen = new Map<string, number>();
  return images.map((image) => {
    const style = image.color?.trim() ?? "";
    const count = (seen.get(style) ?? 0) + 1;
    seen.set(style, count);
    const base = style ? `${name}, ${style}` : name;
    return count === 1 ? base : `${base}, photo ${count}`;
  });
}

export const catalogService = {
  /**
   * Creates or updates a product with its images, variants, styles and collections in one transaction.
   * Variants missing from the input are deactivated (never deleted: orders reference them); a new row with one
   * of their SKUs brings that variant back. Blank SKUs, photo descriptions and style numbers (saveStyles) are made
   * here. Returns the product as the editor's values after the save.
   */
  async saveProduct(
    actorId: string,
    input: { id?: string | undefined; product: ProductData; duplicatedFrom?: string },
  ): Promise<SavedProduct> {
    const { product } = input;
    // Admin enters product price and shipping separately; customers pay (and see) the sum, with free shipping.
    const customerPrice = (productPricePaisa: number) => productPricePaisa + product.shippingPaisa;
    const activePrices = product.variants.filter((v) => v.isActive).map((v) => customerPrice(v.pricePaisa));
    const fromPricePaisa = activePrices.length > 0 ? Math.min(...activePrices) : 0;
    if (product.isPublished && activePrices.length === 0) {
      throw new AppError("VALIDATION_FAILED", "A published product needs at least one variant for sale.", {
        fields: { variants: "Tick For sale on at least one variant, or switch off Published" },
      });
    }
    // Drafts may have no description yet (specs/product-editor-on-page.md); productSchema says the same.
    if (product.isPublished && product.description.trim() === "") {
      throw new AppError("VALIDATION_FAILED", "Add a description before publishing.", {
        fields: { description: "Add a description before publishing" },
      });
    }

    try {
      return await db.$transaction(async (tx) => {
        const category = await tx.category.findFirst({
          where: { id: product.categoryId, archivedAt: null },
          select: { id: true },
        });
        if (!category)
          throw new AppError("VALIDATION_FAILED", "Choose a category.", {
            fields: { categoryId: "Choose a category" },
          });
        const sizeGuideId = emptyToNull(product.sizeGuideId);
        if (sizeGuideId) {
          const guide = await tx.sizeGuide.findFirst({
            where: { id: sizeGuideId, archivedAt: null },
            select: { id: true },
          });
          if (!guide)
            throw new AppError("VALIDATION_FAILED", "Choose a size guide.", {
              fields: { sizeGuideId: "Choose a size guide" },
            });
        }

        const existing = input.id
          ? await tx.product.findUnique({
              where: { id: input.id },
              select: { id: true, publishedAt: true, archivedAt: true },
            })
          : null;
        if (input.id && (!existing || existing.archivedAt))
          throw new AppError("NOT_FOUND", "Product not found.");

        // SKUs are unique across the shop. A new row with the SKU of one of this product's own variants that
        // isn't in the form (a page opened before a save, or a variant added again) takes that variant over, so
        // its orders keep pointing at it. A SKU another product uses is named on its row instead of failing on
        // the constraint.
        const withSkus = await fillBlankSkus(tx, existing?.id ?? null, product.slug, product.variants);
        const keptIds = withSkus.flatMap((variant) => (variant.id ? [variant.id] : []));
        const clashes = await tx.productVariant.findMany({
          where: { sku: { in: withSkus.map((variant) => variant.sku) }, id: { notIn: keptIds } },
          select: { id: true, sku: true, productId: true },
        });
        const isOwn = (row: { productId: string }) => existing !== null && row.productId === existing.id;
        const variants = withSkus.map((variant) => {
          const revived = variant.id
            ? undefined
            : clashes.find((row) => isOwn(row) && row.sku === variant.sku);
          return revived ? { ...variant, id: revived.id } : variant;
        });
        const taken = clashes.filter((row) => !variants.some((variant) => variant.id === row.id));
        if (taken.length > 0) {
          const fields: Record<string, string> = {};
          for (const [index, variant] of variants.entries()) {
            const owner = taken.find((row) => row.sku === variant.sku);
            if (!owner) continue;
            fields[`variants.${index}.sku`] = isOwn(owner)
              ? "Another variant of this product uses this SKU"
              : "Another product already uses this SKU";
          }
          const message =
            Object.keys(fields).length === 1
              ? "One SKU is already used. Change it and save again."
              : "Some SKUs are already used. Change them and save again.";
          throw new AppError("VALIDATION_FAILED", message, { fields });
        }

        const data = {
          name: product.name,
          slug: product.slug,
          description: product.description,
          care: emptyToNull(product.care),
          benefits: product.benefits,
          details: product.details,
          countryOfOrigin: emptyToNull(product.countryOfOrigin),
          seoDescription: emptyToNull(product.seoDescription),
          category: { connect: { id: product.categoryId } },
          isPublished: product.isPublished,
          fromPricePaisa,
          shippingPaisa: product.shippingPaisa,
          publishedAt: product.isPublished
            ? (existing?.publishedAt ?? new Date())
            : (existing?.publishedAt ?? null),
          collections: { set: product.collectionIds.map((id) => ({ id })) },
        } satisfies Prisma.ProductUpdateInput;

        // The size guide is set through the relation, like the category (a create can't disconnect).
        const sizeGuide = sizeGuideId ? { connect: { id: sizeGuideId } } : undefined;
        const saved = existing
          ? await tx.product.update({
              where: { id: existing.id },
              data: { ...data, sizeGuide: sizeGuide ?? { disconnect: true } },
              select: { id: true, number: true },
            })
          : await tx.product.create({
              data: {
                ...data,
                ...(sizeGuide ? { sizeGuide } : {}),
                collections: { connect: product.collectionIds.map((id) => ({ id })) },
              },
              select: { id: true, number: true },
            });

        await tx.productImage.deleteMany({ where: { productId: saved.id } });
        if (product.images.length > 0) {
          const images = inShopOrder(product.images, product.variants);
          const alts = defaultAlts(product.name, images);
          await tx.productImage.createMany({
            data: images.map((image, index) => ({
              productId: saved.id,
              url: image.url,
              alt: image.alt || (alts[index] ?? product.name),
              color: emptyToNull(image.color?.trim()),
              sortOrder: index,
            })),
          });
        }

        // "Features that perform" are replaced like the photos; a blank picture description names the feature.
        await tx.productFeature.deleteMany({ where: { productId: saved.id } });
        if (product.features.length > 0) {
          await tx.productFeature.createMany({
            data: product.features.map((feature, index) => ({
              productId: saved.id,
              title: feature.title,
              body: feature.body,
              imageUrl: feature.imageUrl,
              imageAlt: feature.alt || featureAlt(product.name, feature.title),
              sortOrder: index,
            })),
          });
        }

        // Kept variants whose SKU changes first move to a placeholder SKU, so two of them can swap SKUs without
        // either one hitting the unique constraint halfway through.
        const current = await tx.productVariant.findMany({
          where: { productId: saved.id },
          select: { id: true, sku: true },
        });
        for (const variant of variants) {
          const before = current.find((row) => row.id === variant.id);
          if (before && before.sku !== variant.sku) {
            await tx.productVariant.update({ where: { id: before.id }, data: { sku: `${before.id}~` } });
          }
        }

        const savedIds: string[] = [];
        for (const [index, variant] of variants.entries()) {
          const variantData = {
            sku: variant.sku,
            size: emptyToNull(variant.size),
            color: emptyToNull(variant.color),
            pricePaisa: customerPrice(variant.pricePaisa),
            stock: variant.stock,
            isActive: variant.isActive,
            sortOrder: index,
          };
          if (variant.id) {
            const owned = await tx.productVariant.updateMany({
              where: { id: variant.id, productId: saved.id },
              data: variantData,
            });
            if (owned.count === 0) throw new AppError("NOT_FOUND", "Variant not found.");
            savedIds.push(variant.id);
          } else {
            const created = await tx.productVariant.create({
              data: { ...variantData, productId: saved.id },
              select: { id: true },
            });
            savedIds.push(created.id);
          }
        }
        await tx.productVariant.updateMany({
          where: { productId: saved.id, id: { notIn: savedIds } },
          data: { isActive: false },
        });

        // Style numbers and colour shown: one per variant colour (or one for a product without colours).
        const styles = styleColors(product.variants);
        const renamed = await saveStyles(tx, saved, styles, product.styles);
        // Customers' favourites keep pointing at the same style under its new name.
        await moveFavouritesToRenamedStyles(tx, saved.id, renamed);

        await recordAudit(tx, {
          actorId,
          action: existing ? "product.update" : "product.create",
          entity: "Product",
          entityId: saved.id,
          diff: {
            name: product.name,
            isPublished: product.isPublished,
            variants: product.variants.length,
            styles: styles.filter(Boolean).length,
            features: product.features.length,
            sizeGuideId,
            shippingPaisa: product.shippingPaisa,
            ...(input.duplicatedFrom ? { duplicatedFrom: input.duplicatedFrom } : {}),
          },
        });
        const after = await readProductForEdit(tx, saved.id);
        return {
          id: after.id,
          slug: after.slug,
          savedAt: after.updatedAt.toISOString(),
          values: after.values,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const target = JSON.stringify((error as { meta?: unknown }).meta ?? "");
        conflictFrom(error, target.includes("sku") ? "SKU" : "slug");
      }
      throw error;
    }
  },

  /**
   * Copies a product as a draft to start a similar one: "{name} (copy)", slug "{slug}-copy" (then -copy-2…), same
   * photos, text, details, features, size guide, category, collections, shipping, prices and colour shown; stock 0,
   * new SKUs (made like blank ones), and a new product number with new style numbers.
   */
  async duplicateProduct(actorId: string, id: string): Promise<SavedProduct> {
    const source = await db.product.findFirst({
      where: { id, archivedAt: null },
      select: {
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
        shippingPaisa: true,
        collections: { where: { archivedAt: null }, select: { id: true } },
        images: { select: { url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
        features: {
          select: { title: true, body: true, imageUrl: true, imageAlt: true },
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          select: { size: true, color: true, pricePaisa: true, isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        styles: { select: { color: true, colourShown: true } },
      },
    });
    if (!source) throw new AppError("NOT_FOUND", "Product not found.");

    const slug = await freeSlug(`${source.slug.slice(0, 110).replace(/-+$/, "")}-copy`);

    // A description made from the old name would name the old product, so it goes back to blank (made again).
    const madeAlts = defaultAlts(source.name, source.images);
    const alt = (text: string, index: number) => (text === madeAlts[index] ? "" : text);
    const forSale = source.variants.filter((variant) => variant.isActive);
    const copied = forSale.length > 0 ? forSale : source.variants;
    // Photos of a style that isn't copied (switched off) would point at nothing.
    const styles = new Set(copied.map((variant) => variant.color ?? ""));
    return catalogService.saveProduct(actorId, {
      duplicatedFrom: id,
      product: {
        name: `${source.name.slice(0, 113)} (copy)`,
        slug,
        description: source.description,
        care: source.care ?? "",
        benefits: source.benefits,
        details: source.details,
        countryOfOrigin: source.countryOfOrigin?.trim() || DEFAULT_COUNTRY_OF_ORIGIN,
        seoDescription: source.seoDescription ?? "",
        categoryId: source.categoryId,
        sizeGuideId: source.sizeGuide && !source.sizeGuide.archivedAt ? source.sizeGuide.id : "",
        collectionIds: source.collections.map((collection) => collection.id),
        isPublished: false,
        images: source.images.flatMap((image, index) =>
          !image.color || styles.has(image.color)
            ? [{ url: image.url, alt: alt(image.alt, index), color: image.color ?? "" }]
            : [],
        ),
        features: source.features.map((feature) => ({
          title: feature.title,
          body: feature.body,
          imageUrl: feature.imageUrl,
          alt: feature.imageAlt === featureAlt(source.name, feature.title) ? "" : feature.imageAlt,
        })),
        // The colour shown is copied; the style numbers are the copy's own (saveStyles makes them).
        styles: source.styles.map((style) => ({ color: style.color, colourShown: style.colourShown ?? "" })),
        shippingPaisa: source.shippingPaisa,
        variants: copied.map((variant) => ({
          sku: "",
          size: variant.size ?? "",
          color: variant.color ?? "",
          // Stored prices include shipping; saveProduct takes the product price without it.
          pricePaisa: variant.pricePaisa - source.shippingPaisa,
          stock: 0,
          isActive: true,
        })),
      },
    });
  },

  /**
   * Starts a product from the New product popup (specs/product-editor-on-page.md): a draft with the name, category
   * and price, a slug made from the name (-2, -3… when taken), no description or photos, no shipping, origin China,
   * and one variant (no size or colour, stock 0, made SKU) with its style number. The editor opens on it.
   */
  async createDraft(actorId: string, input: CreateDraftProductInput): Promise<{ id: string }> {
    const saved = await catalogService.saveProduct(actorId, {
      product: {
        name: input.name,
        slug: await freeSlug(slugFrom(input.name)),
        description: "",
        care: "",
        benefits: [],
        details: [],
        countryOfOrigin: DEFAULT_COUNTRY_OF_ORIGIN,
        seoDescription: "",
        categoryId: input.categoryId,
        sizeGuideId: "",
        collectionIds: [],
        isPublished: false,
        images: [],
        features: [],
        styles: [],
        shippingPaisa: 0,
        variants: [{ sku: "", size: "", color: "", pricePaisa: input.pricePaisa, stock: 0, isActive: true }],
      },
    });
    return { id: saved.id };
  },

  /** Hides a product for good (soft delete). Orders keep their snapshots. */
  async archiveProduct(actorId: string, id: string) {
    return db.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { id, archivedAt: null },
        data: { archivedAt: new Date(), isPublished: false },
      });
      if (updated.count === 0) throw new AppError("NOT_FOUND", "Product not found.");
      await recordAudit(tx, { actorId, action: "product.archive", entity: "Product", entityId: id });
      return { id };
    });
  },

  async saveCategory(actorId: string, input: CategoryInput) {
    try {
      return await db.$transaction(async (tx) => {
        const data = { name: input.name, slug: input.slug, sortOrder: input.sortOrder };
        const saved = input.id
          ? await tx.category.update({ where: { id: input.id }, data, select: { id: true } })
          : await tx.category.create({ data, select: { id: true } });
        await recordAudit(tx, {
          actorId,
          action: input.id ? "category.update" : "category.create",
          entity: "Category",
          entityId: saved.id,
          diff: data,
        });
        return saved;
      });
    } catch (error) {
      return conflictFrom(error, "slug");
    }
  },

  async archiveCategory(actorId: string, id: string) {
    return db.$transaction(async (tx) => {
      const inUse = await tx.product.count({ where: { categoryId: id, archivedAt: null } });
      if (inUse > 0) {
        throw new AppError(
          "CONFLICT",
          `Move or archive the ${plural(inUse, "product", "products")} in this category first.`,
        );
      }
      const updated = await tx.category.updateMany({
        where: { id, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      if (updated.count === 0) throw new AppError("NOT_FOUND", "Category not found.");
      await recordAudit(tx, { actorId, action: "category.archive", entity: "Category", entityId: id });
      return { id };
    });
  },

  /**
   * Creates or updates a size guide (specs/size-guides.md). Names are unique among guides that aren't archived,
   * ignoring case. The chart is stored as JSON and read back through parseSizeChart.
   */
  async saveSizeGuide(actorId: string, input: SizeGuideInput & { id?: string | undefined }) {
    return db.$transaction(async (tx) => {
      if (input.id) {
        const existing = await tx.sizeGuide.findFirst({
          where: { id: input.id, archivedAt: null },
          select: { id: true },
        });
        if (!existing) throw new AppError("NOT_FOUND", "Size guide not found.");
      }
      const clash = await tx.sizeGuide.findFirst({
        where: {
          archivedAt: null,
          name: { equals: input.name, mode: "insensitive" },
          ...(input.id ? { id: { not: input.id } } : {}),
        },
        select: { id: true },
      });
      if (clash) {
        throw new AppError("VALIDATION_FAILED", "There's already a size guide with this name.", {
          fields: { name: "There's already a size guide with this name" },
        });
      }
      const imageUrl = emptyToNull(input.imageUrl);
      const data = {
        name: input.name,
        intro: emptyToNull(input.intro),
        chart: input.chart as Prisma.InputJsonValue,
        fitTips: emptyToNull(input.fitTips),
        howToMeasure: input.howToMeasure,
        imageUrl,
        imageAlt: imageUrl ? emptyToNull(input.imageAlt) : null,
      };
      const saved = input.id
        ? await tx.sizeGuide.update({ where: { id: input.id }, data, select: { id: true } })
        : await tx.sizeGuide.create({ data, select: { id: true } });
      await recordAudit(tx, {
        actorId,
        action: input.id ? "sizeGuide.update" : "sizeGuide.create",
        entity: "SizeGuide",
        entityId: saved.id,
        diff: {
          name: input.name,
          measurements: input.chart.columns,
          sizes: input.chart.rows.map((row) => row.size),
        },
      });
      return saved;
    });
  },

  /** Archives a size guide; refused while products that aren't archived still use it. */
  async archiveSizeGuide(actorId: string, id: string) {
    return db.$transaction(async (tx) => {
      const inUse = await tx.product.count({ where: { sizeGuideId: id, archivedAt: null } });
      if (inUse > 0) {
        throw new AppError(
          "CONFLICT",
          inUse === 1
            ? "1 product uses this size guide. Pick another guide on it first."
            : `${inUse} products use this size guide. Pick another guide on them first.`,
        );
      }
      const updated = await tx.sizeGuide.updateMany({
        where: { id, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      if (updated.count === 0) throw new AppError("NOT_FOUND", "Size guide not found.");
      await recordAudit(tx, { actorId, action: "sizeGuide.archive", entity: "SizeGuide", entityId: id });
      return { id };
    });
  },

  async saveCollection(actorId: string, input: CollectionInput) {
    try {
      return await db.$transaction(async (tx) => {
        const data = {
          name: input.name,
          slug: input.slug,
          description: emptyToNull(input.description),
          isFeatured: input.isFeatured,
        };
        const saved = input.id
          ? await tx.collection.update({ where: { id: input.id }, data, select: { id: true } })
          : await tx.collection.create({ data, select: { id: true } });
        await recordAudit(tx, {
          actorId,
          action: input.id ? "collection.update" : "collection.create",
          entity: "Collection",
          entityId: saved.id,
          diff: data,
        });
        return saved;
      });
    } catch (error) {
      return conflictFrom(error, "slug");
    }
  },

  async archiveCollection(actorId: string, id: string) {
    return db.$transaction(async (tx) => {
      const updated = await tx.collection.updateMany({
        where: { id, archivedAt: null },
        data: { archivedAt: new Date(), isFeatured: false },
      });
      if (updated.count === 0) throw new AppError("NOT_FOUND", "Collection not found.");
      await recordAudit(tx, { actorId, action: "collection.archive", entity: "Collection", entityId: id });
      return { id };
    });
  },
};
