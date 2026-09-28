import { Badge, DataTable, Link, Stack } from "@virzeen/ui";
import { orderNumberSchema } from "@virzeen/validators";
import { notFound } from "next/navigation";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { OrderActions } from "@/client/features/admin/order-actions";
import { OrderDetail } from "@/client/features/orders/order-detail";
import { formatDateTime } from "@/client/lib/format";
import { paymentStatus } from "@/client/lib/order-labels";
import { requireAdminPage } from "@/server/auth/session";
import { getAdminOrder } from "@/server/queries/admin";

type Props = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: (await params).orderNumber };
}

export default async function AdminOrderPage({ params }: Props) {
  await requireAdminPage();
  const { orderNumber } = await params;
  if (!orderNumberSchema.safeParse(orderNumber).success) notFound();
  const order = await getAdminOrder(orderNumber);
  if (!order) notFound();

  return (
    <Stack gap={8}>
      <Link href="/admin/orders" variant="subtle" className="text-small">
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
            { key: "provider", header: "Provider", cell: (row) => row.provider },
            {
              key: "ref",
              header: "Reference",
              cell: (row) => <span className="font-mono">{row.providerRef}</span>,
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
              cell: (row) =>
                `${row.type === "PAYMENT_STATUS" ? "Payment" : "Order"}: ${row.from ?? "—"} → ${row.to}`,
            },
            { key: "actor", header: "By", hideOnMobile: true, cell: (row) => row.actor.split(":")[0] },
            { key: "reason", header: "Note", hideOnMobile: true, cell: (row) => row.reason ?? "" },
          ]}
        />
      </section>
    </Stack>
  );
}
