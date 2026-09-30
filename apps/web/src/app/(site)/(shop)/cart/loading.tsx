import { Container, Skeleton } from "@virzeen/ui";

const LINES = ["a", "b"];

/** Skeleton matching the bag page: title and lines on the left, the summary on the right (ui-discipline.md §6). */
export default function CartLoading() {
  return (
    <Container className="py-8 lg:py-12" aria-busy>
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="flex flex-col">
          <div className="flex flex-col items-center gap-2 pb-2 lg:items-start">
            <Skeleton className="h-8 w-20 lg:h-10" />
            <Skeleton shape="text" className="w-36 lg:hidden" />
          </div>
          <div className="divide-y divide-line">
            {LINES.map((id) => (
              <div key={id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 py-6 sm:gap-x-6">
                <Skeleton shape="image" className="w-28 sm:w-36 lg:w-40" />
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between gap-4">
                    <Skeleton shape="text" className="w-1/2" />
                    <Skeleton shape="text" className="w-16" />
                  </div>
                  <Skeleton shape="text" className="w-24" />
                </div>
                <div className="col-span-2 flex gap-3">
                  <Skeleton className="h-11 w-28 rounded-full" />
                  <Skeleton className="size-11 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:self-start">
          <Skeleton className="mb-3 h-8 w-32 lg:h-10" />
          <Skeleton shape="text" className="w-full" />
          <Skeleton shape="text" className="w-full" />
          <Skeleton className="mt-3 h-14 w-full" />
          <Skeleton className="mt-5 hidden h-12 w-full rounded-full md:block" />
        </div>
      </div>
    </Container>
  );
}
