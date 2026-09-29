"use client";

import { Container, Grid, Skeleton } from "@virzeen/ui";
import { usePathname } from "next/navigation";
import PortfolioStoryLoading from "./[slug]/loading";

const CARDS = ["a", "b", "c", "d"];

/**
 * Skeleton matching the portfolio index: heading, then a two-column grid of 3:2 cover cards (ui-discipline.md §6).
 * This boundary also wraps the story pages, so on the way to a story it shows the story skeleton instead
 * (client only for usePathname).
 */
export default function PortfolioLoading() {
  const pathname = usePathname();
  if (pathname !== "/portfolio") return <PortfolioStoryLoading />;

  return (
    <Container className="flex flex-col gap-12 py-12 lg:py-16" aria-busy>
      <div className="flex max-w-3xl flex-col gap-4">
        <Skeleton shape="text" className="w-24" />
        <Skeleton className="h-10 w-full lg:h-14" />
        <Skeleton className="h-10 w-2/3 lg:h-14" />
      </div>
      <Grid columns="two" gap={8} className="gap-y-16">
        {CARDS.map((id) => (
          <div key={id} className="flex flex-col gap-4">
            <Skeleton className="aspect-3/2 w-full" />
            <Skeleton shape="text" className="w-20" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton shape="text" className="w-full max-w-prose" />
          </div>
        ))}
      </Grid>
    </Container>
  );
}
