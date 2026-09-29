import { SiteFooter } from "@/client/components/layout/site-footer";
import { SiteHeader } from "@/client/components/layout/site-header";
import { CartDrawer } from "@/client/features/cart/cart-drawer";
import { CartProvider } from "@/client/features/cart/cart-provider";
import { getUser } from "@/server/auth/session";
import { getCartView } from "@/server/queries/cart";
import { listCategories } from "@/server/queries/catalog";

/** Customer-facing shell: header, bag drawer, footer. The admin area has its own layout. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, cart, categories] = await Promise.all([getUser(), getCartView(), listCategories()]);
  return (
    <CartProvider initialCart={cart}>
      <a
        href="#main"
        className="sr-only z-60 rounded-sm bg-ink text-canvas focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      {/* At least one screen tall, with main taking the slack, so a short page's footer sits at the bottom.
          The skip link's target stays clear of the sticky header through globals.css (scroll-padding-top). */}
      <div className="flex min-h-dvh flex-col">
        <SiteHeader isSignedIn={Boolean(user)} categories={categories} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
      <CartDrawer />
    </CartProvider>
  );
}
