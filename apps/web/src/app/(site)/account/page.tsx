import { ButtonLink, EmptyState, Link } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { ProductCarousel } from "@/client/features/products/product-carousel";
import { formatMonthYear } from "@/client/lib/format";
import { requireUserPage } from "@/server/auth/session";
import { listMyFavourites } from "@/server/queries/account";

/** How many favourites the profile's row shows; "View all" opens the rest. */
const FAVOURITES_SHOWN = 12;

/**
 * The profile, like Nike's member page (owner 2026-11-08): a round initial, the name as the h1 with "Member since
 * {month year}", then the customer's favourites as a row of cards with "View all" (one card per product, newest
 * first).
 */
export default async function ProfilePage() {
  const user = await requireUserPage("/account");
  const favourites = await listMyFavourites(user.id);
  const seen = new Set<string>();
  const products = favourites
    .map((favourite) => favourite.product)
    .filter((product) => !seen.has(product.id) && Boolean(seen.add(product.id)))
    .slice(0, FAVOURITES_SHOWN);
  const name = user.name.trim() || user.email;

  return (
    <div className="flex flex-col gap-16 lg:gap-24">
      <div className="flex items-center gap-5">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface font-display text-h2 text-ink-muted"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-h2 wrap-anywhere">{name}</h1>
          <p className="text-small text-ink-muted">Member since {formatMonthYear(user.createdAt)}</p>
        </div>
      </div>

      {products.length > 0 ? (
        <ProductCarousel
          title="Favourites"
          products={products}
          action={
            <Link
              href="/favourites"
              variant="default"
              className="inline-flex min-h-11 items-center text-small"
            >
              View all
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="profile-favourites" className="flex flex-col gap-6">
          <h2 id="profile-favourites" className="font-display text-h2">
            Favourites
          </h2>
          <EmptyState
            icon={<Heart className="size-5" strokeWidth={1.5} aria-hidden />}
            title="Items added to your Favourites will be saved here."
            action={
              <ButtonLink href="/shop" shape="pill">
                Shop
              </ButtonLink>
            }
          />
        </section>
      )}
    </div>
  );
}
