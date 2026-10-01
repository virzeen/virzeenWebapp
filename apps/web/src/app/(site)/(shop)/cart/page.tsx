import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { CartPageContent } from "@/client/features/cart/cart-page-content";
import { BAG_FAVOURITES_SHOWN } from "@/client/features/favourites/favourite-bag";
import { getUser } from "@/server/auth/session";
import { listMyFavourites } from "@/server/queries/account";
import { listNewArrivals } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Bag", robots: { index: false } };

// Messages a redirect back to the bag can carry (content-style.md "Standard messages").
const NOTICES: Record<string, { tone: "warning" | "info"; text: string }> = {
  "out-of-stock": { tone: "warning", text: "Some items just sold out. We've updated your bag." },
  "price-changed": {
    tone: "warning",
    text: "A price changed since you added this item. Please review your bag.",
  },
  empty: { tone: "info", text: "Add something to your bag to check out." },
};

/** How many products "You might also like" offers (fewer when some are in the bag). */
const SUGGESTIONS = 12;

/** A signed-in customer's newest favourites for under the bag; a guest's are read in the browser. */
async function favouritesPreview() {
  const user = await getUser();
  if (!user) return null;
  const items = await listMyFavourites(user.id);
  return { items: items.slice(0, BAG_FAVOURITES_SHOWN), total: items.length };
}

export default async function CartPage({ searchParams }: { searchParams: SearchParams }) {
  const notice = NOTICES[flattenSearchParams(await searchParams).notice ?? ""];
  const [favourites, suggestions] = await Promise.all([favouritesPreview(), listNewArrivals(SUGGESTIONS)]);
  return (
    <Container className="py-8 lg:py-12">
      <CartPageContent notice={notice ?? null} favourites={favourites} suggestions={suggestions} />
    </Container>
  );
}
