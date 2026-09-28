import "server-only";
import "@/server/bootstrap";
import { addressService, orderService } from "@virzeen/core";

// Every read is scoped to the signed-in user id (security-policy.md §3).

export const listMyOrders = (userId: string, cursor?: string) =>
  orderService.listForUser(userId, { cursor, limit: 20 });
export const listMyAddresses = (userId: string) => addressService.list(userId);

/** Another customer's order → null (the page shows 404). */
export async function getMyOrder(userId: string, orderNumber: string) {
  try {
    return await orderService.getForUser(userId, orderNumber);
  } catch {
    return null;
  }
}

export type MyOrder = NonNullable<Awaited<ReturnType<typeof getMyOrder>>>;
