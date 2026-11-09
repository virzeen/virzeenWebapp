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
  /** The style names in style order; the grey line lists them when there are two or more. */
  styles: string[];
  /** The grey line otherwise. */
  categoryName: string;
};

type ProductCardProps = {
  product: ProductCardData;
  priority?: boolean;
  /** Runs as the link starts navigating (the search panel closes itself); client components only. */
  onNavigate?: () => void;
};

/**
 * Product grid card: the whole card is one link (patterns.md §5). Under the square photo, like Nike's (owner
 * 2026-11-08): the name, a grey line with the colours ("Black, White") or else the category, then the price.
 */
export function ProductCard({ product, priority = false, onNavigate }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.slug}`}
      onNavigate={onNavigate}
      variant="subtle"
      className="group flex flex-col gap-3 text-ink hover:text-ink"
    >
      <div className="relative">
        {/* Square photos, like Nike's cards (owner 2026-11-08). */}
        <CloudImage
          src={product.imageUrl}
          alt={product.imageAlt}
          ratio="square"
          sizes="(min-width: 1024px) 33vw, 50vw"
          priority={priority}
          imageClassName="transition-transform duration-400 ease-standard motion-safe:group-hover:scale-102"
        />
        {!product.inStock && (
          <Badge variant="neutral" className="absolute top-3 left-3">
            Out of stock
          </Badge>
        )}
      </div>
      {/* Nike's sizes: the name and the grey line 14px on phones and 16px from md, the price 16px. */}
      <div className="flex flex-col">
        <span className="text-small font-medium md:text-body">{product.name}</span>
        <span className="text-small text-ink-muted md:text-body">
          {product.styles.length > 1 ? product.styles.join(", ") : product.categoryName}
        </span>
        <Price paisa={product.fromPricePaisa} symbol="रु" className="mt-1 text-body font-medium" />
      </div>
    </Link>
  );
}
