import { Grid, Skeleton } from "@virzeen/ui";

const CARD_IDS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Favourites cards while they load: photo, name, price, style and Remove (ui-discipline.md §6). */
export function FavouritesGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Grid columns="products" gap={4} className="gap-y-10" aria-busy>
      {CARD_IDS.slice(0, Math.min(Math.max(count, 1), CARD_IDS.length)).map((id) => (
        <div key={id} className="flex flex-col gap-3">
          <Skeleton shape="image" />
          <Skeleton shape="text" className="w-3/4" />
          <Skeleton shape="text" className="w-1/3" />
          <div className="flex h-11 items-center">
            <Skeleton shape="text" className="w-16" />
          </div>
        </div>
      ))}
    </Grid>
  );
}

/** The whole Favourites page while the server renders it: heading, count and cards. */
export function FavouritesPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-40 lg:h-11" />
        <Skeleton shape="text" className="w-16" />
      </div>
      <FavouritesGridSkeleton />
    </div>
  );
}
