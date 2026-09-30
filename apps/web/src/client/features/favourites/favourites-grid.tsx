import { cn } from "@virzeen/ui";

/** The Favourites grid (specs/favourites.md "Nike layout"): 2 columns on phones, 3 from `md`. Cards and skeletons. */
export function FavouritesGrid({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3", className)} {...props} />;
}
