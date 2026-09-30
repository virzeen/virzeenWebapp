import { Container, Skeleton, Stack } from "@virzeen/ui";

/**
 * Skeleton matching the checkout: the centred title, then the steps (address, delivery, payment, Place order) and,
 * from lg, the order summary on the right. The order confirmation page under /checkout shows it too
 * (ui-discipline.md §6).
 */
export default function CheckoutLoading() {
  return (
    <Container className="flex flex-col gap-6 py-8 lg:gap-12 lg:py-12" aria-busy>
      <Skeleton className="h-8 w-40 self-center lg:h-10" />
      <div className="mx-auto grid w-full max-w-4xl gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="flex flex-col divide-y divide-line">
          <Skeleton className="mb-2 h-14 w-full lg:hidden" />
          <Stack gap={4} className="py-8 lg:pt-0">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton shape="text" className="w-36" />
          </Stack>
          <Stack gap={2} className="py-8">
            <Skeleton className="h-7 w-28" />
            <Skeleton shape="text" className="w-2/3" />
          </Stack>
          <Stack gap={4} className="py-8">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-20 w-full" />
          </Stack>
          <div className="py-8">
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
        <Stack gap={6} className="hidden lg:flex lg:self-start">
          <Skeleton className="h-7 w-40" />
          <Stack gap={3}>
            <Skeleton shape="text" className="w-full" />
            <Skeleton shape="text" className="w-full" />
            <Skeleton className="mt-3 h-14 w-full" />
          </Stack>
          <div className="flex gap-4">
            <Skeleton shape="image" className="w-24 shrink-0" />
            <Stack gap={2} className="flex-1">
              <Skeleton shape="text" className="w-3/4" />
              <Skeleton shape="text" className="w-1/3" />
              <Skeleton shape="text" className="w-1/2" />
            </Stack>
          </div>
        </Stack>
      </div>
    </Container>
  );
}
