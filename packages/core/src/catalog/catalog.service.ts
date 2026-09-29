import "server-only";
import { db, type Prisma } from "@virzeen/db";
import type { CategoryInput, CollectionInput, ProductData } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError, isUniqueViolation } from "../errors";

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

export const catalogService = {
  /**
   * Creates or updates a product with its images, variants and collections in one transaction.
   * Variants missing from the input are deactivated (never deleted: orders reference them); a new row with one
   * of their SKUs brings that variant back.
   */
  async saveProduct(actorId: string, input: { id?: string | undefined; product: ProductData }) {
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
        const keptIds = product.variants.flatMap((variant) => (variant.id ? [variant.id] : []));
        const clashes = await tx.productVariant.findMany({
          where: { sku: { in: product.variants.map((variant) => variant.sku) }, id: { notIn: keptIds } },
          select: { id: true, sku: true, productId: true },
        });
        const isOwn = (row: { productId: string }) => existing !== null && row.productId === existing.id;
        const variants = product.variants.map((variant) => {
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

        const saved = existing
          ? await tx.product.update({ where: { id: existing.id }, data, select: { id: true, slug: true } })
          : await tx.product.create({
              data: { ...data, collections: { connect: product.collectionIds.map((id) => ({ id })) } },
              select: { id: true, slug: true },
            });

        await tx.productImage.deleteMany({ where: { productId: saved.id } });
        if (product.images.length > 0) {
          await tx.productImage.createMany({
            data: product.images.map((image, index) => ({
              productId: saved.id,
              url: image.url,
              alt: image.alt,
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

        await recordAudit(tx, {
          actorId,
          action: existing ? "product.update" : "product.create",
          entity: "Product",
          entityId: saved.id,
          diff: {
            name: product.name,
            isPublished: product.isPublished,
            variants: product.variants.length,
            shippingPaisa: product.shippingPaisa,
          },
        });
        return saved;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const target = JSON.stringify((error as { meta?: unknown }).meta ?? "");
        conflictFrom(error, target.includes("sku") ? "SKU" : "slug");
      }
      throw error;
    }
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
