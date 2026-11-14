import { Alert, ButtonLink, Container, Stack } from "@virzeen/ui";
import { orderNumberSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { OrderDetail } from "@/client/features/orders/order-detail";
import { OrderPaymentState } from "@/client/features/orders/order-payment-state";
import { getUser } from "@/server/auth/session";
import { getMyOrder } from "@/server/queries/account";
import { getGuestOrder } from "@/server/queries/checkout";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

type Props = { searchParams: SearchParams };

/**
 * The order in `?order=`, read once per request for the title and the page. A member sees their own orders; a guest
 * sees only the order their signed cookie names (specs/checkout-v2-week1.md). Anything else is null (404).
 */
const loadOrder = cache(async (order: string | undefined) => {
  const orderNumber = orderNumberSchema.safeParse(order);
  if (!orderNumber.success) return null;
  const user = await getUser();
  const found = user ? await getMyOrder(user.id, orderNumber.data) : await getGuestOrder(orderNumber.data);
  return found ? { order: found, isGuest: !user } : null;
});

// The tab title says the same as the heading. A missing order gets the not-found page's title.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const loaded = await loadOrder(flattenSearchParams(await searchParams).order);
  if (!loaded) notFound();
  const { order } = loaded;
  const title =
    order.status === "CANCELLED"
      ? "Order cancelled"
      : order.status === "PENDING"
        ? "Confirming your payment"
        : "Order confirmed";
  return { title, robots: { index: false } };
}

/** Safe to refresh: this page only reads the order (duplicate callbacks are handled in core). */
export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const loaded = await loadOrder(flattenSearchParams(await searchParams).order);
  if (!loaded) notFound();
  const { order, isGuest } = loaded;
  const confirmed = order.status !== "PENDING" && order.status !== "CANCELLED";

  return (
    <Container className="flex flex-col gap-10 py-12 lg:py-16">
      <Stack gap={4} className="max-w-2xl">
        {confirmed && (
          <>
            <h1 className="font-display text-h1">
              Thank you — your order <span className="whitespace-nowrap">{order.orderNumber}</span> is
              confirmed.
            </h1>
            <p className="text-body-lg text-ink-muted">
              {isGuest
                ? `We've emailed your confirmation to ${order.customerEmail}.`
                : "We've emailed your confirmation. Track your order any time in your account."}
            </p>
          </>
        )}
        {order.status === "CANCELLED" && (
          <>
            <h1 className="font-display text-h1">
              Order <span className="whitespace-nowrap">{order.orderNumber}</span> was cancelled.
            </h1>
            {/* A payment that came after the order was cancelled: being refunded, or refunded. */}
            <OrderPaymentState order={order} methods={[]} failed={false} now={0} />
          </>
        )}
        {/*
          The provider hasn't confirmed the payment the customer just came back from, so no Pay now here: it would
          invite a second payment while this one settles (specs/payment-window.md). The order page has Pay now.
        */}
        {order.status === "PENDING" && (
          <>
            <h1 className="font-display text-h1">We&apos;re confirming your payment.</h1>
            <Alert variant="info">
              This usually takes a minute — you&apos;ll get an email when it&apos;s done. Your order number is{" "}
              <span className="whitespace-nowrap">{order.orderNumber}</span>.
            </Alert>
          </>
        )}
        <div className="flex flex-wrap gap-3">
          {!isGuest && (
            <ButtonLink href={`/account/orders/${order.orderNumber}`} shape="pill">
              View order
            </ButtonLink>
          )}
          <ButtonLink href="/shop" variant="secondary" shape="pill">
            Continue shopping
          </ButtonLink>
        </div>
      </Stack>
      <OrderDetail order={order} />
    </Container>
  );
}
