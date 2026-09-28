import { z } from "zod";
import { idSchema, requiredText } from "./common";
import { isDistrictInProvince, PROVINCES } from "./nepal";

/** 10-digit Nepali mobile number starting with 97 or 98 (docs/backend/backend-policies.md §4). */
export const phoneSchema = z
  .string({ error: "Enter a 10-digit mobile number starting with 97 or 98" })
  .trim()
  .regex(/^9[78]\d{8}$/, { error: "Enter a 10-digit mobile number starting with 97 or 98" });

export const addressSchema = z
  .strictObject({
    fullName: requiredText("full name", 100),
    phone: phoneSchema,
    province: z.enum(PROVINCES, { error: "Choose your province" }),
    district: requiredText("district", 60),
    city: requiredText("city or municipality", 80),
    street: requiredText("street address", 200),
    landmark: z.string().trim().max(200).optional().or(z.literal("")),
    isDefault: z.boolean().optional(),
  })
  .refine((a) => isDistrictInProvince(a.province, a.district), {
    path: ["district"],
    error: "Choose a district in this province",
  });
export type AddressInput = z.input<typeof addressSchema>;
export type Address = z.output<typeof addressSchema>;

export const updateAddressSchema = z.strictObject({ id: idSchema, address: addressSchema });
export const addressIdSchema = z.strictObject({ id: idSchema });
