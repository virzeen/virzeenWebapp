import type { FeatureLayout, FeatureRow, SizeChart, SizeGuideKind } from "@virzeen/validators";

// What the product page shows. The shop's page passes the product it read (catalogReads.getProductBySlug); the
// admin preview builds the same shape from the editor's unsaved values (admin/preview-draft.ts).

/**
 * The size guide behind the "Size guide" popup (specs/size-guides.md, specs/product-page-v2.md).
 * - CHART (Clothing): `chart` is the size table, values in cm; `imageUrl` is the optional how-to-measure picture.
 * - PICTURE (Accessories): `chart` is null; `imageUrl` is the size chart picture (never null).
 */
export type SizeGuideView = {
  kind: SizeGuideKind;
  name: string;
  intro: string | null;
  chart: SizeChart | null;
  fitTips: string | null;
  /** One tip per line. */
  howToMeasure: string[];
  imageUrl: string | null;
  imageAlt: string | null;
};

/**
 * A "Features that perform" card (specs/product-page-v2.md); `imageAlt` is never blank. `title` and `body` may be ""
 * (a feature that is only a picture): show them only when present.
 */
export type ProductFeatureView = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
};

export type ProductDetailsData = {
  /** The product id (the Favourite button saves it); "preview" in the admin preview. */
  productId: string;
  name: string;
  description: string;
  care: string | null;
  /** "Benefits" and "Product details" bullets in the product details popup. */
  benefits: string[];
  details: string[];
  countryOfOrigin: string | null;
  category: { name: string; slug: string };
  /** `color`: the style a photo shows; null = every style (specs/product-styles.md). */
  images: { id: string; url: string; alt: string; color: string | null }[];
  features: ProductFeatureView[];
  /** How "Features that perform" is laid out (specs/product-page-v2.md). */
  featureLayout: FeatureLayout;
  /** The Custom layout's rows, top to bottom (used when `featureLayout` is CUSTOM; none = "Three across"). */
  featureRows: FeatureRow[];
  sizeGuide: SizeGuideView | null;
  /** For sale only; `pricePaisa` is what the customer pays (shipping included). */
  variants: { id: string; size: string | null; color: string | null; pricePaisa: number; stock: number }[];
  sizes: string[];
  colors: string[];
  /**
   * Each style's number and "Colour shown" (specs/product-editor-on-page.md), in style order; one style with color ""
   * for a product without styles. `code` is "" for a style not saved yet (preview); `colourShown` is null when there
   * is nothing to show (the "" style without one).
   */
  styles: StyleView[];
};

export type StyleView = { color: string; code: string; colourShown: string | null };
