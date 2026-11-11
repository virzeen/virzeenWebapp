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
