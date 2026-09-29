import { Badge, Button, Link } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import type { FavouriteView } from "@/server/actions/favourites";

/** The product and the saved style, "Linen Overshirt, Black" (just the name without styles). */
export const favouriteName = ({ product, color }: FavouriteView) =>
  color ? `${product.name}, ${color}` : product.name;

/** The product page with the saved style picked. */
export const favouriteHref = ({ product, color }: FavouriteView) =>
  color ? `/product/${product.slug}?style=${encodeURIComponent(color)}` : `/product/${product.slug}`;

type FavouriteCardProps = {
  item: FavouriteView;
  priority?: boolean;
  onRemove: () => void;
};

/**
 * A saved product in the product card look (patterns.md §5): the saved style's photo, name, price and style
 * link to the product page; "Remove" sits under the link, since a button can't go inside one.
 */
export function FavouriteCard({ item, priority = false, onRemove }: FavouriteCardProps) {
  const { product, color } = item;
  return (
    <div role="listitem" className="flex flex-col gap-1">
      <Link
        href={favouriteHref(item)}
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
          <span className="text-body">{product.name}</span>
          <Price paisa={product.fromPricePaisa} className="text-small text-ink-muted" />
          {color && <span className="text-small text-ink-muted">{color}</span>}
        </div>
      </Link>
      <Button
        variant="link"
        size="sm"
        className="self-start"
        aria-label={`Remove ${favouriteName(item)}`}
        data-remove-favourite
        onClick={onRemove}
      >
        Remove
      </Button>
    </div>
  );
}
