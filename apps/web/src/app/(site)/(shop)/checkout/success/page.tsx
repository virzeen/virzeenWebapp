import { Alert, ButtonLink, Container, Stack } from "@virzeen/ui";
import { orderNumberSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/client/features/orders/order-detail";
import { requireUserPage } from "@/server/auth/session";
import { getMyOrder } from "@/server/queries/account";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

/** Safe to refresh: this page only reads the order (duplicate callbacks are handled in core). */
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const orderNumber = orderNumberSchema.safeParse(flattenSearchParams(await searchParams).order);
  const user = await requireUserPage("/account/orders");
  if (!orderNumber.success) notFound();
  const order = await getMyOrder(user.id, orderNumber.data);
  if (!order) notFound();
  const confirmed = order.status !== "PENDING" && order.status !== "CANCELLED";

  return (
    <Container className="gap-10 py-12 lg:py-16 flex flex-col">
      <Stack gap={4} className="max-w-2xl">
        {confirmed && (
          <>
            <h1 className="font-display text-h1">Thank you — your order {order.orderNumber} is confirmed.</h1>
            <p className="text-body-lg text-ink-muted">
              We&apos;ve emailed your confirmation. Track your order any time in your account.
            </p>
          </>
        )}
        {order.status === "CANCELLED" && (
          <h1 className="font-display text-h1">Order {order.orderNumber} was cancelled.</h1>
        )}
        {order.status === "PENDING" && (
          <>
            <h1 className="font-display text-h1">We&apos;re confirming your payment.</h1>
            <Alert variant="info">
              This usually takes a minute — you&apos;ll get an email when it&apos;s done. Your order number is{" "}
              {order.orderNumber}.
            </Alert>
          </>
        )}
        <div className="gap-3 flex flex-wrap">
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
