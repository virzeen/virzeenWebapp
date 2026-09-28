import { Alert, Link, Stack } from "@virzeen/ui";
import { orderNumberSchema } from "@virzeen/validators";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/client/features/orders/order-detail";
import { requireUserPage } from "@/server/auth/session";
import { getMyOrder } from "@/server/queries/account";

type Props = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Order ${(await params).orderNumber}` };
}

export default async function OrderPage({ params }: Props) {
  const { orderNumber } = await params;
  const user = await requireUserPage(`/account/orders/${orderNumber}`);
  if (!orderNumberSchema.safeParse(orderNumber).success) notFound();
  const order = await getMyOrder(user.id, orderNumber);
  if (!order) notFound();

  return (
    <Stack gap={8}>
      <div className="gap-2 flex flex-col">
        <Link href="/account/orders" variant="subtle" className="text-small">
          ← All orders
        </Link>
        <h2 className="font-mono text-h2">{order.orderNumber}</h2>
      </div>
      {order.paymentStatus === "PENDING" && (
        <Alert variant="info">
          We&apos;re confirming your payment. This usually takes a minute — you&apos;ll get an email when
          it&apos;s done.
        </Alert>
      )}
      <OrderDetail order={order} />
    </Stack>
  );
}
