import { Badge, DataTable, Link, Stack } from "@virzeen/ui";
import { orderNumberSchema } from "@virzeen/validators";
import { notFound } from "next/navigation";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { OrderActions } from "@/client/features/admin/order-actions";
import { OrderDetail } from "@/client/features/orders/order-detail";
import { formatDateTime } from "@/client/lib/format";
import { PAYMENT_METHOD_LABELS, paymentStatus, timelineLabel } from "@/client/lib/order-labels";
import { requireAdminPage } from "@/server/auth/session";
import { getAdminOrder } from "@/server/queries/admin";

type Props = { params: Promise<{ orderNumber: string }> };

/**
 * "Confirmed → Being packed" or "Payment: Unpaid → Pay on delivery", in the words the badges and the
 * timeline above use (never the raw status codes).
 */
function changeLabel(event: { type: string; from: string | null; to: string }, paymentMethod: string) {
  const isPayment = event.type === "PAYMENT_STATUS";
  const label = (status: string) =>
    isPayment ? paymentStatus(status, paymentMethod).label : timelineLabel(status);
  const change = event.from ? `${label(event.from)} → ${label(event.to)}` : label(event.to);
  return isPayment ? `Payment: ${change}` : change;
}

// A missing order gets the admin not-found page's title instead of the number typed in the address.
export async function generateMetadata({ params }: Props) {
  await requireAdminPage();
  const { orderNumber } = await params;
  if (!orderNumberSchema.safeParse(orderNumber).success || !(await getAdminOrder(orderNumber))) notFound();
  return { title: orderNumber };
}

export default async function AdminOrderPage({ params }: Props) {
  await requireAdminPage();
  const { orderNumber } = await params;
  if (!orderNumberSchema.safeParse(orderNumber).success) notFound();
  const order = await getAdminOrder(orderNumber);
  if (!order) notFound();

  return (
    <Stack gap={8}>
      <Link
        href="/admin/orders"
        variant="subtle"
        className="inline-flex min-h-11 items-center self-start text-small"
      >
        ← Orders
      </Link>
      <AdminPageHeader
        title={order.orderNumber}
        description={
          <>
            {order.user.name ? `${order.user.name} · ` : ""}
            {order.customerEmail}
          </>
        }
        actions={
          <OrderActions
            orderNumber={order.orderNumber}
            status={order.status}
            paymentStatus={order.paymentStatus}
            paymentMethod={order.paymentMethod}
          />
        }
      />
      <OrderDetail order={order} />

      <section aria-labelledby="payments-heading" className="flex flex-col gap-4">
        <h2 id="payments-heading" className="font-display text-h3">
          Payment attempts
        </h2>
        <DataTable
          caption="Payment attempts"
          rows={order.payments}
          getRowId={(row) => row.id}
          columns={[
            {
              key: "provider",
              header: "Provider",
              hideOnMobile: true,
              cell: (row) => PAYMENT_METHOD_LABELS[row.provider] ?? row.provider,
            },
            {
              key: "ref",
              header: "Reference",
              hideOnMobile: true,
              cell: (row) => <span className="font-mono whitespace-nowrap">{row.providerRef}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (row) => (
                <Badge variant={paymentStatus(row.status).variant}>{paymentStatus(row.status).label}</Badge>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              cell: (row) => <Price paisa={row.amountPaisa} />,
            },
            {
              key: "checked",
              header: "Last check",
              hideOnMobile: true,
              cell: (row) =>
                row.lastCheckedAt ? `${formatDateTime(row.lastCheckedAt)} · ${row.lastIssue ?? "OK"}` : "—",
            },
          ]}
        />
      </section>

      <section aria-labelledby="events-heading" className="flex flex-col gap-4">
        <h2 id="events-heading" className="font-display text-h3">
          Full history
        </h2>
        <DataTable
          caption="Order and payment events"
          rows={order.events}
          getRowId={(row) => row.id}
          columns={[
            { key: "when", header: "When", cell: (row) => formatDateTime(row.createdAt) },
            {
              key: "what",
              header: "Change",
              cell: (row) => changeLabel(row, order.paymentMethod),
            },
            { key: "actor", header: "By", hideOnMobile: true, cell: (row) => row.actor.split(":")[0] },
            { key: "reason", header: "Note", hideOnMobile: true, cell: (row) => row.reason ?? "" },
          ]}
        />
      </section>
    </Stack>
  );
}
