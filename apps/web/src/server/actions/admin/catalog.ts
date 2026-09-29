"use server";

import "server-only";
import { catalogService } from "@virzeen/core";
import {
  archiveSchema,
  categorySchema,
  collectionSchema,
  duplicateProductSchema,
  saveProductSchema,
  saveSizeGuideSchema,
  uploadSignatureSchema,
} from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { signUpload } from "@/server/services/cloudinary";
import { runAdminAction } from "./guard";

const refreshCatalog = (slug?: string) => {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/product/${slug}`);
};

export async function saveProductAction(input: unknown) {
  return runAdminAction("saveProduct", async (admin) => {
    const { id, product } = saveProductSchema.parse(input);
    const saved = await catalogService.saveProduct(admin.id, { id, product });
    refreshCatalog(saved.slug);
    return saved;
  });
}

/** Copies a product as a draft; the caller opens the copy's editor. */
export async function duplicateProductAction(input: unknown) {
  return runAdminAction("duplicateProduct", async (admin) => {
    const { id } = duplicateProductSchema.parse(input);
    const copy = await catalogService.duplicateProduct(admin.id, id);
    // Drafts aren't in the shop, so only the admin pages need fresh data.
    revalidatePath("/admin/products");
    return copy;
  });
}

export async function archiveProductAction(input: unknown) {
  return runAdminAction("archiveProduct", async (admin) => {
    const { id } = archiveSchema.parse(input);
    const result = await catalogService.archiveProduct(admin.id, id);
    refreshCatalog();
    return result;
  });
}

export async function saveCategoryAction(input: unknown) {
  return runAdminAction("saveCategory", async (admin) => {
    const data = categorySchema.parse(input);
    const saved = await catalogService.saveCategory(admin.id, data);
    refreshCatalog();
    return saved;
  });
}

export async function archiveCategoryAction(input: unknown) {
  return runAdminAction("archiveCategory", async (admin) => {
    const { id } = archiveSchema.parse(input);
    const result = await catalogService.archiveCategory(admin.id, id);
    refreshCatalog();
    return result;
  });
}

export async function saveCollectionAction(input: unknown) {
  return runAdminAction("saveCollection", async (admin) => {
    const data = collectionSchema.parse(input);
    const saved = await catalogService.saveCollection(admin.id, data);
    refreshCatalog();
    return saved;
  });
}

export async function archiveCollectionAction(input: unknown) {
  return runAdminAction("archiveCollection", async (admin) => {
    const { id } = archiveSchema.parse(input);
    const result = await catalogService.archiveCollection(admin.id, id);
    refreshCatalog();
    return result;
  });
}

/** Create or update a size guide (specs/size-guides.md); every product using it shows the change. */
export async function saveSizeGuideAction(input: unknown) {
  return runAdminAction("saveSizeGuide", async (admin) => {
    const { id, guide } = saveSizeGuideSchema.parse(input);
    const saved = await catalogService.saveSizeGuide(admin.id, { ...guide, id });
    refreshCatalog();
    return saved;
  });
}

/** Refused (CONFLICT) while products still use the guide. */
export async function archiveSizeGuideAction(input: unknown) {
  return runAdminAction("archiveSizeGuide", async (admin) => {
    const { id } = archiveSchema.parse(input);
    const result = await catalogService.archiveSizeGuide(admin.id, id);
    refreshCatalog();
    return result;
  });
}

/** Signed parameters for a direct browser → Cloudinary upload (the secret never leaves the server). */
export async function getUploadSignatureAction(input: unknown) {
  return runAdminAction("getUploadSignature", async () => {
    const { folder, entityId } = uploadSignatureSchema.parse(input);
    return signUpload(folder, entityId);
  });
}
