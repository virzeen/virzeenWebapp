import { Container, Skeleton } from "@virzeen/ui";

const LINES = ["a", "b"];

/** Skeleton matching the bag page: lines on the left, summary card on the right (ui-discipline.md §6). */
export default function CartLoading() {
  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16" aria-busy>
      <Skeleton className="h-9 w-24 lg:h-11" />
      <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
        <div className="divide-y divide-line border-y border-line">
          {LINES.map((id) => (
            <div key={id} className="flex gap-4 py-4">
              <Skeleton shape="image" className="w-20 shrink-0 sm:w-24" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-4">
                  <Skeleton shape="text" className="w-1/2" />
                  <Skeleton shape="text" className="w-16" />
                </div>
                <Skeleton shape="text" className="w-24" />
                <Skeleton className="mt-auto h-11 w-32 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-88 rounded-md lg:self-start" />
      </div>
    </Container>
  );
}
