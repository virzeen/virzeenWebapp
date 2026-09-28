import { z } from "zod";
import { orderNumberSchema } from "./common";

const reason = z.string().trim().min(3, { error: "Add a short reason" }).max(300);

/** Admin fulfilment steps. Allowed transitions are enforced in core (payment-policy.md §3). */
export const advanceOrderSchema = z.discriminatedUnion("to", [
  z.strictObject({ orderNumber: orderNumberSchema, to: z.literal("PROCESSING") }),
  z.strictObject({
    orderNumber: orderNumberSchema,
    to: z.literal("SHIPPED"),
    courierName: z.string().trim().min(2, { error: "Enter the courier name" }).max(60),
    trackingNumber: z.string().trim().min(2, { error: "Enter the tracking number" }).max(80),
  }),
  z.strictObject({ orderNumber: orderNumberSchema, to: z.literal("DELIVERED") }),
  z.strictObject({ orderNumber: orderNumberSchema, to: z.literal("CANCELLED"), reason }),
  z.strictObject({ orderNumber: orderNumberSchema, to: z.literal("RETURNED"), reason }),
]);
export type AdvanceOrderInput = z.infer<typeof advanceOrderSchema>;

export const orderRefSchema = z.strictObject({ orderNumber: orderNumberSchema });
export type OrderRefInput = z.infer<typeof orderRefSchema>;

export const orderWithReasonSchema = z.strictObject({ orderNumber: orderNumberSchema, reason });
export type OrderWithReasonInput = z.infer<typeof orderWithReasonSchema>;

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

export const adminOrderFiltersSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional().catch(undefined),
  q: z.string().trim().max(60).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type AdminOrderFilters = z.output<typeof adminOrderFiltersSchema>;
