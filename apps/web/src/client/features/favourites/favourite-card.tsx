import { Button, Link } from "@virzeen/ui";
import { X } from "lucide-react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import type { FavouriteView } from "@/server/actions/favourites";
import { favouriteDetails, favouriteHref } from "./favourite-bag";
import { FavouriteBagButton } from "./favourite-bag-button";

/**
 * The product and the saved style, "Linen Overshirt, Black" (just the name without styles, or when the style isn't
 * sold any more).
 */
export const favouriteName = ({ product, style }: FavouriteView) =>
  style ? `${product.name}, ${style}` : product.name;

type FavouriteCardProps = {
  item: FavouriteView;
  priority?: boolean;
  /** Edit mode: a round Remove (X) on the photo's top right. */
  editing: boolean;
  onRemove: () => void;
};

/**
 * A saved product, Nike's way (specs/favourites.md "Nike layout"): one link to the product in the saved style (the
 * square photo, the name with the price on the right, "Category · Style" in grey), then the bag pill. On phones the
 * price goes under the name: beside it, a half-width column left no room for a word like "Heavyweight". A button
 * can't sit inside a link, so Remove lies over the photo beside it. A style that isn't sold any more shows the
 * product's usual photo and price, with just the category.
 */
export function FavouriteCard({ item, priority = false, editing, onRemove }: FavouriteCardProps) {
  const { product } = item;
  return (
    <div role="listitem" className="relative flex flex-col gap-4">
      <Link
        href={favouriteHref(item)}
        variant="subtle"
        className="group flex flex-col gap-3 text-ink hover:text-ink"
      >
        <CloudImage
          src={product.imageUrl}
          alt={product.imageAlt}
          ratio="square"
          sizes="(min-width: 768px) 33vw, 50vw"
          priority={priority}
          imageClassName="transition-transform duration-400 ease-standard motion-safe:group-hover:scale-102"
        />
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            {/* A word longer than the space left for it breaks instead of pushing the price out of the card. */}
            <span className="min-w-0 text-body font-medium wrap-break-word">{product.name}</span>
            <Price paisa={product.fromPricePaisa} className="shrink-0 text-body font-medium" />
          </div>
          <span className="text-body wrap-break-word text-ink-muted">{favouriteDetails(item)}</span>
        </div>
      </Link>
      {editing && (
        <Button
          variant="secondary"
          size="icon"
          shape="pill"
          className="absolute top-2 right-2"
          aria-label={`Remove ${favouriteName(item)}`}
          data-remove-favourite
          onClick={onRemove}
        >
          <X className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
      )}
      <FavouriteBagButton item={item} />
    </div>
  );
}
