import type { SizeChart } from "@virzeen/validators";

// What the product page shows. The shop's page passes the product it read (catalogReads.getProductBySlug); the
// admin preview builds the same shape from the editor's unsaved values (admin/preview-draft.ts).

/** The size guide behind the "Size guide" popup (specs/size-guides.md). Chart values are in cm. */
export type SizeGuideView = {
  name: string;
  intro: string | null;
  chart: SizeChart;
  fitTips: string | null;
  /** One tip per line. */
  howToMeasure: string[];
  imageUrl: string | null;
  imageAlt: string | null;
};

/** A "Features that perform" card (specs/product-page.md); `imageAlt` is never blank. */
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
  sizeGuide: SizeGuideView | null;
  /** For sale only; `pricePaisa` is what the customer pays (shipping included). */
  variants: { id: string; size: string | null; color: string | null; pricePaisa: number; stock: number }[];
  sizes: string[];
  colors: string[];
};
