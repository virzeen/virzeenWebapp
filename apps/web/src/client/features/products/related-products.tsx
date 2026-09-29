import { Container, Grid } from "@virzeen/ui";
import { ProductCard, type ProductCardData } from "./product-card";

/**
 * "You may also like" under a product page: other products of the same category (specs/product-page.md). Shared by
 * the shop's product page and the admin preview, so both show the same section. Nothing when there are none.
 */
export function RelatedProducts({ items }: { items: ProductCardData[] }) {
  if (items.length === 0) return null;
  return (
    <Container as="section" className="flex flex-col gap-8 py-16" aria-labelledby="related-heading">
      <h2 id="related-heading" className="font-display text-h2">
        You may also like
      </h2>
      <Grid columns="products" gap={4}>
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </Grid>
    </Container>
  );
}
