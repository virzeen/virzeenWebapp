import { z } from "zod";
import { idSchema } from "./common";

// "Notify me when it's back" (specs/notify-me.md): a signed-in customer waits for one sold-out variant.

/** Ask for, or stop, the email for one variant (a style and size). */
export const stockAlertSchema = z.strictObject({ variantId: idSchema });
export type StockAlertInput = z.infer<typeof stockAlertSchema>;
