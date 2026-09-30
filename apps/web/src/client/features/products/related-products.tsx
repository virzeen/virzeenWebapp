import { Container } from "@virzeen/ui";
import type { ProductCardData } from "./product-card";
import { ProductCarousel } from "./product-carousel";

/** The two rows under a product (core's ProductRecommendations, as cards). */
export type RecommendationsView = { sameCategory: ProductCardData[]; otherCategories: ProductCardData[] };

/** Nothing to recommend: while loading, or when the read failed. */
export const NO_RECOMMENDATIONS: RecommendationsView = { sameCategory: [], otherCategories: [] };

type RelatedProductsProps = {
  recommendations: RecommendationsView;
  /**
   * In the product editor: no page-width wrapper (the admin frame has its gutters), a line under each heading, and
   * the cards open in a new tab so the editor stays open.
   */
  inEditor?: boolean;
};

/**
 * Under a product page (specs/product-page-v2.md "Recommendations"): "You may also like" (published products of the
 * same category) then "More from Virzeen" (the other categories), each a carousel hidden when empty. Shared by the
 * shop's product page, the admin Preview and the product editor, so all three show the same rows.
 */
export function RelatedProducts({ recommendations, inEditor = false }: RelatedProductsProps) {
  const { sameCategory, otherCategories } = recommendations;
  if (sameCategory.length === 0 && otherCategories.length === 0) return null;

  const rows = (
    <>
      <ProductCarousel
        title="You may also like"
        description={
          inEditor
            ? "Published products in the same category, as customers see them. Each opens in a new tab."
            : undefined
        }
        products={sameCategory}
        newTab={inEditor}
      />
      <ProductCarousel
        title="More from Virzeen"
        description={
          inEditor
            ? "Published products in other categories, as customers see them. Each opens in a new tab."
            : undefined
        }
        products={otherCategories}
        newTab={inEditor}
      />
    </>
  );
  return inEditor ? (
    <div className="flex flex-col gap-16 py-16">{rows}</div>
  ) : (
    <Container className="flex flex-col gap-16 py-16">{rows}</Container>
  );
}
