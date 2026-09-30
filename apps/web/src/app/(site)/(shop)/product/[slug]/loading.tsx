import { Container, Skeleton, Stack } from "@virzeen/ui";

const THUMBNAILS = ["a", "b", "c", "d"];
const TILES = ["a", "b", "c"];

/** Skeleton matching the product layout (product-details.tsx): name and price, gallery, pickers and buttons. */
export default function ProductLoading() {
  return (
    <Container className="py-6 lg:py-12" aria-busy>
      <Skeleton shape="text" className="mb-6 w-40" />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:grid-rows-[auto_1fr] lg:gap-x-16">
        <Stack gap={2} className="lg:col-start-2 lg:row-start-1 lg:max-w-md">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton shape="text" className="w-32" />
          <Skeleton shape="text" className="mt-2 w-24" />
        </Stack>
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="hidden justify-end gap-4 lg:flex">
            <div className="flex w-16 shrink-0 flex-col gap-2">
              {THUMBNAILS.map((key) => (
                <Skeleton key={key} className="size-16" />
              ))}
            </div>
            <Skeleton shape="image" className="max-w-gallery-photo rounded-md" />
          </div>
          {/* Phones: the photo runs to the screen edges, like the gallery. */}
          <Skeleton shape="image" className="-mx-4 w-auto rounded-none sm:-mx-6 lg:hidden" />
        </div>
        <Stack gap={6} className="lg:col-start-2 lg:row-start-2 lg:max-w-md">
          <div className="flex gap-2">
            {TILES.map((key) => (
              <Skeleton key={key} className="size-16" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </Stack>
      </div>
    </Container>
  );
}
