import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { FavouritesList } from "@/client/features/favourites/favourites-list";
import { GuestFavourites } from "@/client/features/favourites/guest-favourites";
import { getUser } from "@/server/auth/session";
import { listMyFavourites } from "@/server/queries/account";

export const metadata: Metadata = { title: "Favourites", robots: { index: false } };

/**
 * Saved products (specs/favourites.md). Signed in: the account's, rendered here. Guest: this browser's, which
 * only the browser can read, so the cards load there.
 */
export default async function FavouritesPage() {
  const user = await getUser();
  return (
    <Container className="py-12 lg:py-16">
      {user ? <FavouritesList items={await listMyFavourites(user.id)} /> : <GuestFavourites />}
    </Container>
  );
}
