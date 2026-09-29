import { sortSizes, type ProductInput } from "@virzeen/validators";
import type { ProductDetailsData, SizeGuideView } from "@/client/features/products/product-details-data";

// The editor hands its current values to the preview tab through localStorage (same browser, same site), so the
// preview shows unsaved changes and follows them as the admin edits (specs/admin-product-editor.md "Preview").

export type PreviewDraft = {
  values: ProductInput;
  category: { name: string; slug: string } | null;
  /** The picked size guide, from the form's options: the preview can't read the database. */
  sizeGuide: SizeGuideView | null;
};

/** `key` is the product id, or "new" on the New product page. */
export const previewStorageKey = (key: string) => `virzeen:product-preview:${key}`;
export const previewUrl = (key: string) => `/preview/product?key=${encodeURIComponent(key)}`;

export function writePreviewDraft(key: string, draft: PreviewDraft) {
  try {
    localStorage.setItem(previewStorageKey(key), JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the preview keeps showing the last draft it had.
  }
}

export function readPreviewDraft(key: string): string | null {
  try {
    return localStorage.getItem(previewStorageKey(key));
  } catch {
    return null;
  }
}

// JSON turns the form's NaN (blank number boxes) into null.
const amount = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
/** Bullet lines without the blank ones the admin is still typing. */
const lines = (list: readonly unknown[] | undefined) => (list ?? []).map(text).filter(Boolean);

/**
 * What the product page would show for these editor values: rows for sale only, prices with shipping added,
 * blank photo and feature descriptions made from the name (like catalogService.saveProduct), sizes in shop order.
 * Drafts saved by an older editor may lack the newer fields: they show as empty.
 */
export function toPreviewProduct(draft: PreviewDraft): ProductDetailsData {
  const { values } = draft;
  const name = text(values.name) || "Product name";
  const shipping = amount(values.shippingPaisa);
  const variants = values.variants
    .filter((variant) => variant.isActive)
    .map((variant, index) => ({
      id: variant.id ?? `preview-${index}`,
      size: text(variant.size) || null,
      color: text(variant.color) || null,
      pricePaisa: amount(variant.pricePaisa) + shipping,
      stock: Math.max(amount(variant.stock), 0),
    }));
  return {
    productId: "preview",
    name,
    description: text(values.description),
    care: text(values.care) || null,
    benefits: lines(values.benefits),
    details: lines(values.details),
    countryOfOrigin: text(values.countryOfOrigin) || null,
    category: draft.category ?? { name: "No category yet", slug: "" },
    images: values.images.map((image, index) => ({
      id: `${index}-${image.url}`,
      url: image.url,
      alt: text(image.alt) || (index === 0 ? name : `${name}, photo ${index + 1}`),
      color: text(image.color) || null,
    })),
    features: (values.features ?? []).map((feature, index) => {
      const title = text(feature.title);
      return {
        id: `${index}-${feature.imageUrl}`,
        title,
        body: text(feature.body),
        imageUrl: text(feature.imageUrl),
        imageAlt: text(feature.alt) || (title ? `${name}, ${title}` : name),
      };
    }),
    sizeGuide: draft.sizeGuide ?? null,
    variants,
    sizes: sortSizes(variants.flatMap((variant) => (variant.size ? [variant.size] : []))),
    colors: [...new Set(variants.flatMap((variant) => (variant.color ? [variant.color] : [])))],
  };
}
