import { z } from "zod";
import { idSchema } from "./common";

/** Admin: give a customer the Monochrome Pass for 6 or 12 months (a running Pass is extended). */
export const grantPassSchema = z.strictObject({
  userId: z.string().min(1).max(100),
  months: z.union([z.literal(6), z.literal(12)]),
});
export type GrantPassInput = z.infer<typeof grantPassSchema>;

/** Admin: end a customer's Pass now. */
export const endPassSchema = z.strictObject({ userId: z.string().min(1).max(100) });

/** The customers list's search box (email or name). */
export const customerSearchSchema = z.string().trim().max(60).catch("");

/** Admin: add credit (whole rupees) or points to a customer, with a reason that is kept in the audit log. */
export const adminWalletSchema = z.strictObject({
  userId: z.string().min(1).max(100),
  kind: z.enum(["CREDIT", "POINTS"]),
  amount: z
    .int({ error: "Enter a whole number" })
    .min(1, { error: "Enter an amount above zero" })
    .max(1_000_000, {
      error: "Enter 1,000,000 or less",
    }),
  reason: z.string().trim().min(1, { error: "Say why" }).max(200),
});
export type AdminWalletInput = z.infer<typeof adminWalletSchema>;

/** A friend's referral code, as typed (the server upper-cases it and looks it up). */
export const referralCodeSchema = z.strictObject({
  code: z
    .string({ error: "Enter a code" })
    .trim()
    .min(4, { error: "Enter a code" })
    .max(20, { error: "That code is too long" }),
});
export type ReferralCodeInput = z.infer<typeof referralCodeSchema>;

/** The member's birthday, saved once ("YYYY-MM-DD", not in the future; specs/member-perks.md). */
export const birthdaySchema = z.strictObject({
  birthday: z.iso
    .date({ error: "Enter a valid date" })
    .refine((value) => value >= "1900-01-01" && value <= new Date().toISOString().slice(0, 10), {
      error: "Enter a valid date",
    }),
});
export type BirthdayInput = z.infer<typeof birthdaySchema>;

/** Early access (specs/member-perks.md): when the public may see a product; null clears it. */
export const setPublicAtSchema = z.strictObject({
  id: idSchema,
  publicAt: z.iso.datetime({ error: "Enter a valid date and time" }).nullable(),
});
export type SetPublicAtInput = z.infer<typeof setPublicAtSchema>;
