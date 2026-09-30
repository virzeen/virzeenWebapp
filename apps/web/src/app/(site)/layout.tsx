import { firstName } from "@/client/components/layout/nav-current";
import { SiteFooter } from "@/client/components/layout/site-footer";
import { SiteHeader } from "@/client/components/layout/site-header";
import { AddedToBagPanel } from "@/client/features/cart/added-to-bag-panel";
import { CartProvider } from "@/client/features/cart/cart-provider";
import { FavouritesProvider } from "@/client/features/favourites/favourites-provider";
import { getUser } from "@/server/auth/session";
import { listMyFavouriteKeys } from "@/server/queries/account";
import { getCartView } from "@/server/queries/cart";
import { listCategories } from "@/server/queries/catalog";

/** A signed-in customer's favourites, for every Favourite button; guests keep theirs in the browser. */
async function favouriteKeys() {
  const user = await getUser(); // memoised: the same session read as below
  return user ? listMyFavouriteKeys(user.id) : [];
}

/** Customer-facing shell: header, "Added to bag" panel, footer. The admin area has its own layout. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, cart, categories, favourites] = await Promise.all([
    getUser(),
    getCartView(),
    listCategories(),
    favouriteKeys(),
  ]);
  return (
    <CartProvider initialCart={cart}>
      <FavouritesProvider signedIn={Boolean(user)} initialKeys={favourites}>
        <a
          href="#main"
          className="sr-only z-60 rounded-sm bg-ink text-canvas focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-3"
        >
          Skip to content
        </a>
        {/* At least one screen tall, with main taking the slack, so a short page's footer sits at the bottom.
          The skip link's target stays clear of the sticky header through globals.css (scroll-padding-top). */}
        <div className="flex min-h-dvh flex-col">
          <SiteHeader isSignedIn={Boolean(user)} firstName={firstName(user?.name)} categories={categories} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
        <AddedToBagPanel />
      </FavouritesProvider>
    </CartProvider>
  );
}
