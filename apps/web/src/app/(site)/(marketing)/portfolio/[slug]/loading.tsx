import { Container, Skeleton } from "@virzeen/ui";

/** Skeleton matching a portfolio story: full-bleed hero, then the intro in the narrow column. */
export default function PortfolioStoryLoading() {
  return (
    <div aria-busy>
      <Skeleton className="aspect-4/5 w-full rounded-none md:aspect-16/9" />
      <Container width="narrow" className="flex flex-col gap-3 py-16 lg:py-24">
        <Skeleton shape="text" className="w-full" />
        <Skeleton shape="text" className="w-full" />
        <Skeleton shape="text" className="w-1/2" />
      </Container>
    </div>
  );
}
