import { Link, Stack } from "@virzeen/ui";
import { orderNumberSchema } from "@virzeen/validators";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/client/features/orders/order-detail";
import { OrderPaymentState } from "@/client/features/orders/order-payment-state";
import { requireUserPage } from "@/server/auth/session";
import { getMyOrder, onlinePaymentMethods, requestTime } from "@/server/queries/account";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

type Props = { params: Promise<{ orderNumber: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Props) {
  return { title: `Order ${(await params).orderNumber}` };
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  // Back from eSewa or Khalti without paying, while the order still waits (specs/payment-window.md).
  const failed = flattenSearchParams(await searchParams).payment === "failed";
  const user = await requireUserPage(`/account/orders/${orderNumber}`);
  if (!orderNumberSchema.safeParse(orderNumber).success) notFound();
  const order = await getMyOrder(user.id, orderNumber);
  if (!order) notFound();

  return (
    <Stack gap={8}>
      <div className="flex flex-col gap-2">
        <Link
          href="/account/orders"
          variant="subtle"
          className="inline-flex min-h-11 items-center self-start text-small"
        >
          ← All orders
        </Link>
        <h1 className="font-mono text-h2">{order.orderNumber}</h1>
      </div>
      <OrderPaymentState order={order} methods={onlinePaymentMethods()} failed={failed} now={requestTime()} />
      <OrderDetail order={order} reviewLinks={order.status === "DELIVERED"} />
    </Stack>
  );
}
