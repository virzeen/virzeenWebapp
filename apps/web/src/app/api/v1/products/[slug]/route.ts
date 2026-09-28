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
    fromPricePaisa: product.fromPricePaisa,
    inStock: product.inStock,
    imageUrl: product.images[0]?.url ?? null,
    images: product.images.map(({ url, alt }) => ({ url, alt })),
    variants: product.variants,
  };
});
