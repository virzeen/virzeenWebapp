import { Alert, ButtonLink, Container, Stack } from "@virzeen/ui";
import { orderNumberSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { OrderDetail } from "@/client/features/orders/order-detail";
import { requireUserPage } from "@/server/auth/session";
import { getMyOrder } from "@/server/queries/account";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

type Props = { searchParams: SearchParams };

/** The order in `?order=`, read once per request for the title and the page; null when it isn't the user's. */
const loadOrder = cache(async (order: string | undefined) => {
  const orderNumber = orderNumberSchema.safeParse(order);
  const user = await requireUserPage("/account/orders");
  return orderNumber.success ? getMyOrder(user.id, orderNumber.data) : null;
});

// The tab title says the same as the heading. A missing order gets the not-found page's title.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const order = await loadOrder(flattenSearchParams(await searchParams).order);
  if (!order) notFound();
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
  const order = await loadOrder(flattenSearchParams(await searchParams).order);
  if (!order) notFound();
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
              We&apos;ve emailed your confirmation. Track your order any time in your account.
            </p>
          </>
        )}
        {order.status === "CANCELLED" && (
          <h1 className="font-display text-h1">
            Order <span className="whitespace-nowrap">{order.orderNumber}</span> was cancelled.
          </h1>
        )}
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
          <ButtonLink href={`/account/orders/${order.orderNumber}`} shape="pill">
            View order
          </ButtonLink>
          <ButtonLink href="/shop" variant="secondary" shape="pill">
            Continue shopping
          </ButtonLink>
        </div>
      </Stack>
      <OrderDetail order={order} />
    </Container>
  );
}
