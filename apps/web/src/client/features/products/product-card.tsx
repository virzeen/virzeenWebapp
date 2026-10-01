import { Badge, Link } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  fromPricePaisa: number;
  imageUrl: string | null;
  imageAlt: string;
  hoverImageUrl: string | null;
  inStock: boolean;
  /** The style names in style order; listed under the price when there are two or more. */
  styles: string[];
};

/** Product grid card: the whole card is one link (patterns.md §5). */
export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      variant="subtle"
      className="group flex flex-col gap-3 text-ink hover:text-ink"
    >
      <div className="relative">
        <CloudImage
          src={product.imageUrl}
          alt={product.imageAlt}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          priority={priority}
          imageClassName="transition-transform duration-400 ease-standard motion-safe:group-hover:scale-102"
        />
        {!product.inStock && (
          <Badge variant="neutral" className="absolute top-3 left-3">
            Out of stock
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-body font-medium">{product.name}</span>
        <Price paisa={product.fromPricePaisa} symbol="रु" className="text-small font-medium text-ink-muted" />
        {product.styles.length > 1 && (
          <span className="text-small text-ink-muted">{product.styles.join(", ")}</span>
        )}
      </div>
    </Link>
  );
}
