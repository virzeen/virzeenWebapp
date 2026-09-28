import { orderService } from "@virzeen/core";
import { orderNumberSchema } from "@virzeen/validators";
import { apiHandler } from "@/server/api/v1";
import { requireUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ orderNumber: string }> };

/** GET /api/v1/orders/:orderNumber → OrderDetail (another customer's order → 404) */
export const GET = apiHandler<Context>("v1.orders.detail", async (_request, { params }) => {
  const user = await requireUser();
  const orderNumber = orderNumberSchema.parse((await params).orderNumber);
  const order = await orderService.getForUser(user.id, orderNumber);
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotalPaisa: order.subtotalPaisa,
    shippingPaisa: order.shippingPaisa,
    totalPaisa: order.totalPaisa,
    createdAt: order.createdAt.toISOString(),
    address: order.address,
    courierName: order.courierName,
    trackingNumber: order.trackingNumber,
    items: order.items.map((item) => ({
      productName: item.productName,
      productSlug: item.productSlug,
      sku: item.sku,
      variantLabel: item.variantLabel,
      imageUrl: item.imageUrl,
      unitPricePaisa: item.unitPricePaisa,
      quantity: item.quantity,
    })),
    timeline: order.events
      .filter((event) => event.type === "ORDER_STATUS")
      .map((event) => ({ status: event.to, at: event.createdAt.toISOString() })),
  };
});
