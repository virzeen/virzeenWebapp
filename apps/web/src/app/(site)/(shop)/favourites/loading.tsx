import { Container } from "@virzeen/ui";
import { FavouritesPageSkeleton } from "@/client/features/favourites/favourites-skeleton";

/** Skeleton matching the Favourites page: heading, count and product cards (ui-discipline.md §6). */
export default function FavouritesLoading() {
  return (
    <Container className="py-12 lg:py-16" aria-busy>
      <FavouritesPageSkeleton />
    </Container>
  );
}
