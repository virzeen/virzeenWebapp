import { Container, Grid, Skeleton } from "@virzeen/ui";

const CARDS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Skeleton matching the shop grid (ui-discipline.md §6). */
export default function ShopLoading() {
  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16" aria-busy>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-11 w-full" />
      <Grid columns="products" gap={4} className="gap-y-10">
        {CARDS.map((id) => (
          <div key={id} className="flex flex-col gap-3">
            <Skeleton shape="image" />
            <Skeleton shape="text" className="w-3/4" />
            <Skeleton shape="text" className="w-1/3" />
          </div>
        ))}
      </Grid>
    </Container>
  );
}
