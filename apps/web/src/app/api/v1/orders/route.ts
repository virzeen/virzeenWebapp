import { orderService } from "@virzeen/core";
import { paginationSchema } from "@virzeen/validators";
import { apiHandler } from "@/server/api/v1";
import { requireUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** GET /api/v1/orders?cursor&limit → OrderSummary[] + nextCursor (own orders only) */
export const GET = apiHandler("v1.orders.list", async (request) => {
  const user = await requireUser();
  const { cursor, limit } = paginationSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const page = await orderService.listForUser(user.id, { cursor, limit });
  return {
    data: page.items.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalPaisa: order.totalPaisa,
      itemCount: order._count.items,
      createdAt: order.createdAt.toISOString(),
    })),
    nextCursor: page.nextCursor,
  };
});
