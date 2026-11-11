import { z } from "zod";

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
