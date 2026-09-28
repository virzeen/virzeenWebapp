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
        className="px-4 py-2 focus:top-2 focus:left-2 sr-only z-60 rounded-sm bg-ink text-canvas focus:not-sr-only focus:fixed"
      >
        Skip to content
      </a>
      <SiteHeader isSignedIn={Boolean(user)} categories={categories} />
      <main id="main" className="min-h-dvh">
        {children}
      </main>
      <SiteFooter />
      <CartDrawer />
    </CartProvider>
  );
}
