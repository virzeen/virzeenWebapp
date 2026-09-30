import { Skeleton } from "@virzeen/ui";
import { FavouritesGrid } from "./favourites-grid";

const CARD_IDS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Favourites cards while they load: square photo, name and price, category, the bag pill (ui-discipline.md §6). */
export function FavouritesGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <FavouritesGrid aria-busy>
      {CARD_IDS.slice(0, Math.min(Math.max(count, 1), CARD_IDS.length)).map((id) => (
        <div key={id} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Skeleton className="aspect-square w-full" />
            <div className="flex flex-col gap-2">
              {/* The price goes under the name on phones, as on the card. */}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3">
                <Skeleton shape="text" className="w-1/2" />
                <Skeleton shape="text" className="w-1/4" />
              </div>
              <Skeleton shape="text" className="w-1/3" />
            </div>
          </div>
          <Skeleton shape="circle" className="h-11 w-full" />
        </div>
      ))}
    </FavouritesGrid>
  );
}

/** The whole Favourites page while the server renders it: the heading row and cards. */
export function FavouritesPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-h-11 items-center">
        <Skeleton className="h-9 w-40 lg:h-11" />
      </div>
      <FavouritesGridSkeleton />
    </div>
  );
}
