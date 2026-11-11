import { z } from "zod";
import { phoneSchema } from "./address";
import { emailSchema } from "./auth";
import { idSchema, orderNumberSchema, requiredText } from "./common";
import { discountCodeInputSchema } from "./discounts";
import { isDistrictInProvince, PROVINCES } from "./nepal";

export const PAYMENT_METHODS = ["COD", "ESEWA", "KHALTI"] as const;
export type PaymentMethodInput = (typeof PAYMENT_METHODS)[number];

export const checkoutSchema = z.strictObject({
  addressId: idSchema,
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
  /** The code the customer applied (specs/discount-codes.md); the server checks it again before saving the order. */
  discountCode: discountCodeInputSchema.optional(),
  /** Pay with the member's points and/or credit (specs/wallet.md); the server works out how much. */
  usePoints: z.boolean().optional(),
  useCredit: z.boolean().optional(),
});

/**
 * A guest's checkout (specs/checkout-v2-week1.md): contact details and a typed address instead of a saved one.
 * Ward is a number; the tole or street and the municipality are free text.
 */
const guestDetailsShape = z.strictObject({
  email: emailSchema,
  firstName: requiredText("first name", 50),
  lastName: requiredText("last name", 50),
  phone: phoneSchema,
  province: z.enum(PROVINCES, { error: "Choose your province" }),
  district: z
    .string({ error: "Choose your district" })
    .trim()
    .min(1, { error: "Choose your district" })
    .max(60),
  municipality: requiredText("municipality", 80),
  ward: z
    .string({ error: "Enter your ward number" })
    .trim()
    .regex(/^\d{1,2}$/, { error: "Enter your ward number (1 to 35)" })
    .refine((value) => Number(value) >= 1 && Number(value) <= 35, {
      error: "Enter your ward number (1 to 35)",
    }),
  street: requiredText("tole or street", 200),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(300, { error: "Keep the note under 300 characters" })
    .optional()
    .or(z.literal("")),
});

const districtInProvince: { path: PropertyKey[]; error: string } = {
  path: ["district"],
  error: "Choose a district in this province",
};

/** The delivery form a guest fills in (also checked again, with the payment method, when they place the order). */
export const guestDetailsSchema = guestDetailsShape.refine(
  (a) => isDistrictInProvince(a.province, a.district),
  districtInProvince,
);
export type GuestDetailsInput = z.input<typeof guestDetailsSchema>;

export const guestCheckoutSchema = guestDetailsShape
  .extend({
    paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
    discountCode: discountCodeInputSchema.optional(),
  })
  .refine((a) => isDistrictInProvince(a.province, a.district), districtInProvince);
export type GuestCheckoutInput = z.input<typeof guestCheckoutSchema>;

/**
 * The checkout summary's totals for the chosen address and, optionally, a discount code. A guest has no saved
 * address: they send the district (for the arrival date) and the email they typed (for a once-per-customer code).
 */
export const checkoutPreviewSchema = z.strictObject({
  addressId: idSchema.nullable().optional(),
  district: z.string().trim().min(1).max(60).optional(),
  email: emailSchema.optional(),
  discountCode: discountCodeInputSchema.optional(),
  usePoints: z.boolean().optional(),
  useCredit: z.boolean().optional(),
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
