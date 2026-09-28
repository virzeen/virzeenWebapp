import { z } from "zod";
import { idSchema, orderNumberSchema } from "./common";

export const PAYMENT_METHODS = ["COD", "ESEWA", "KHALTI"] as const;
export type PaymentMethodInput = (typeof PAYMENT_METHODS)[number];

export const checkoutSchema = z.strictObject({
  addressId: idSchema,
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const retryPaymentSchema = z.strictObject({
  orderNumber: orderNumberSchema,
  paymentMethod: z.enum(["ESEWA", "KHALTI"], { error: "Choose a payment method" }),
});
export type RetryPaymentInput = z.infer<typeof retryPaymentSchema>;

/** eSewa appends ?data=<base64 JSON> to the success URL. Untrusted input (payment-policy.md §5). */
export const esewaCallbackSchema = z.object({
  data: z
    .string()
    .min(1)
    .max(4000)
    .regex(/^[A-Za-z0-9+/=_-]+$/),
});

/** Khalti appends pidx and other params to the return URL. Only pidx is used, then verified (§6). */
export const khaltiCallbackSchema = z.object({
  pidx: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9]+$/),
});
