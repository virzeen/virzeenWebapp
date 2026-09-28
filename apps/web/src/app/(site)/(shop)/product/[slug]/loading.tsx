import { Container, Skeleton, Stack } from "@virzeen/ui";

/** Skeleton matching the product layout. */
export default function ProductLoading() {
  return (
    <Container className="py-6 lg:py-12" aria-busy>
      <Skeleton shape="text" className="mb-6 w-40" />
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-16">
        <Skeleton shape="image" />
        <Stack gap={6}>
          <Skeleton className="h-10 w-3/4" />
          <Skeleton shape="text" className="w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </Stack>
      </div>
    </Container>
  );
}
