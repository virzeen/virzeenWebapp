import { Alert, ButtonLink, Container, Stack } from "@virzeen/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment didn't go through", robots: { index: false } };

/** Failed/cancelled payment: the order is cancelled, stock restored and the items are back in the bag. */
export default function CheckoutFailedPage() {
  return (
    <Container width="narrow" className="py-16 lg:py-24">
      <Stack gap={6}>
        <h1 className="font-display text-h1">Payment didn&apos;t go through.</h1>
        <Alert variant="warning">Your bag is saved — try again or choose another method.</Alert>
        <div className="gap-3 flex flex-wrap">
          <ButtonLink href="/checkout" shape="pill" size="lg">
            Try again
          </ButtonLink>
          <ButtonLink href="/cart" variant="secondary" shape="pill" size="lg">
            View bag
          </ButtonLink>
        </div>
      </Stack>
    </Container>
  );
}
