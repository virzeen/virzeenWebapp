import { Grid } from "@virzeen/ui";

/**
 * The Favourites grid (specs/favourites.md "Nike layout"): the product grid every page uses (`Grid columns="products"`:
 * 2 a row, 3 from lg). Cards and skeletons, so both line up.
 */
export function FavouritesGrid(props: Omit<React.ComponentProps<typeof Grid>, "columns" | "gap">) {
  return <Grid columns="products" gap={4} {...props} />;
}
