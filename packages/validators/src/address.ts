import { z } from "zod";
import { idSchema, requiredText } from "./common";
import { isDistrictInProvince, PROVINCES, type Province } from "./nepal";

const PHONE_ERROR = "Enter a 10-digit mobile number starting with 97 or 98";

/**
 * 10-digit Nepali mobile number starting with 97 or 98 (docs/backend/backend-policies.md §4).
 * Spaces, brackets and hyphens are dropped first, and so is a +977 / 00977 country code in front of
 * 10 digits: "98123 45678" and "+977 9812345678" are both stored as "9812345678".
 */
export const phoneSchema = z
  .string({ error: PHONE_ERROR })
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, "").replace(/^(?:\+|00)?977(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^9[78]\d{8}$/, { error: PHONE_ERROR }));

export const addressSchema = z
  .strictObject({
    fullName: requiredText("full name", 100),
    phone: phoneSchema,
    province: z.enum(PROVINCES, { error: "Choose your province" }),
    // A Select, so "Choose" rather than requiredText's "Enter".
    district: z
      .string({ error: "Choose your district" })
      .trim()
      .min(1, { error: "Choose your district" })
      .max(60),
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

/** The fields of a saved address that the address form edits (a saved row also carries `id`). */
export type SavedAddressFields = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  city: string;
  street: string;
  landmark: string | null;
  isDefault: boolean;
};

/**
 * Form values for editing a saved address. Copies the schema's fields only: `addressSchema` is strict,
 * so passing the whole row (with its `id`) would fail every submit before it reached the server.
 */
export function addressFormValues(saved: SavedAddressFields): AddressInput {
  return {
    fullName: saved.fullName,
    phone: saved.phone,
    province: saved.province as Province,
    district: saved.district,
    city: saved.city,
    street: saved.street,
    landmark: saved.landmark ?? "",
    isDefault: saved.isDefault,
  };
}
