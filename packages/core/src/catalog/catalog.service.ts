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
          ? { variants: "Each variant needs a unique SKU" }
          : { slug: "This slug is already used" },
    });
  }
  throw error;
}

export const catalogService = {
  /**
   * Creates or updates a product with its images, variants and collections in one transaction.
   * Variants missing from the input are deactivated (never deleted: orders reference them).
   */
  async saveProduct(actorId: string, input: { id?: string | undefined; product: ProductData }) {
    const { product } = input;
    const activePrices = product.variants.filter((v) => v.isActive).map((v) => v.pricePaisa);
    const fromPricePaisa = activePrices.length > 0 ? Math.min(...activePrices) : 0;
    if (product.isPublished && activePrices.length === 0) {
      throw new AppError("VALIDATION_FAILED", "A published product needs at least one active variant.", {
        fields: { variants: "Turn on at least one variant before publishing" },
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

        const data = {
          name: product.name,
          slug: product.slug,
          description: product.description,
          care: emptyToNull(product.care),
          seoDescription: emptyToNull(product.seoDescription),
          category: { connect: { id: product.categoryId } },
          isPublished: product.isPublished,
          fromPricePaisa,
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

        const keptIds: string[] = [];
        for (const [index, variant] of product.variants.entries()) {
          const variantData = {
            sku: variant.sku,
            size: emptyToNull(variant.size),
            color: emptyToNull(variant.color),
            pricePaisa: variant.pricePaisa,
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
            keptIds.push(variant.id);
          } else {
            const created = await tx.productVariant.create({
              data: { ...variantData, productId: saved.id },
              select: { id: true },
            });
            keptIds.push(created.id);
          }
        }
        await tx.productVariant.updateMany({
          where: { productId: saved.id, id: { notIn: keptIds } },
          data: { isActive: false },
        });

        await recordAudit(tx, {
          actorId,
          action: existing ? "product.update" : "product.create",
          entity: "Product",
          entityId: saved.id,
          diff: { name: product.name, isPublished: product.isPublished, variants: product.variants.length },
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
        throw new AppError("CONFLICT", `Move or archive the ${inUse} product(s) in this category first.`);
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
