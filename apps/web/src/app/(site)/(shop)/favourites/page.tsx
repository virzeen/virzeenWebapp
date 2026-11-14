import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavouritesList } from "@/client/features/favourites/favourites-list";
import { getUser } from "@/server/auth/session";
import { listMyFavourites } from "@/server/queries/account";

export const metadata: Metadata = { title: "Favourites", robots: { index: false } };

/**
 * Saved products (specs/favourites.md). Signed in: the account's, rendered here. Not signed in (owner request
 * 2026-11-11): straight to the sign-in page, and after signing in on to New and Featured (`/shop`). What a guest
 * saved in this browser moves into the account at sign-in, so nothing is lost.
 */
export default async function FavouritesPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=%2Fshop");
  return (
    <Container className="py-12 lg:py-16">
      <FavouritesList items={await listMyFavourites(user.id)} />
    </Container>
  );
}
