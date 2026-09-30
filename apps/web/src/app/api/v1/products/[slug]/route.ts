import { AppError, catalogReads } from "@virzeen/core";
import { slugSchema } from "@virzeen/validators";
import { apiHandler } from "@/server/api/v1";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

/** GET /api/v1/products/:slug → ProductDetail */
export const GET = apiHandler<Context>("v1.products.detail", async (_request, { params }) => {
  const slug = slugSchema.parse((await params).slug);
  const product = await catalogReads.getProductBySlug(slug);
  if (!product) throw new AppError("NOT_FOUND", "Product not found.");
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    care: product.care,
    benefits: product.benefits,
    details: product.details,
    countryOfOrigin: product.countryOfOrigin,
    fromPricePaisa: product.fromPricePaisa,
    inStock: product.inStock,
    imageUrl: product.images[0]?.url ?? null,
    images: product.images.map(({ url, alt, color }) => ({ url, alt, color })),
    features: product.features.map(({ title, body, imageUrl, imageAlt }) => ({
      title,
      body,
      imageUrl,
      imageAlt,
    })),
    featureLayout: product.featureLayout,
    // The Custom layout's rows, top to bottom; kept (and sent) whatever layout is picked.
    featureRows: product.featureRows,
    // kind "CHART" (a size table in `chart`) or "PICTURE" (the size chart picture in `imageUrl`, `chart` null).
    sizeGuide: product.sizeGuide,
    styles: product.styles,
    variants: product.variants,
  };
});
