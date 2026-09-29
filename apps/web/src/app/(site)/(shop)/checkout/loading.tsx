import { Container, Skeleton, Stack } from "@virzeen/ui";

/**
 * Skeleton matching the checkout: address, delivery and payment sections, then the order summary card
 * (on the right from lg). The order confirmation page under /checkout shows it too (ui-discipline.md §6).
 */
export default function CheckoutLoading() {
  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16" aria-busy>
      <Skeleton className="h-9 w-48 lg:h-11" />
      <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
        <Stack gap={12}>
          <Stack gap={4}>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton shape="text" className="w-36" />
          </Stack>
          <Stack gap={2}>
            <Skeleton className="h-6 w-28" />
            <Skeleton shape="text" className="w-2/3" />
          </Stack>
          <Stack gap={4}>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
          </Stack>
        </Stack>
        <Skeleton className="h-96 rounded-md lg:self-start" />
      </div>
    </Container>
  );
}
