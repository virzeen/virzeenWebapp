import { z } from "zod";
import { idSchema } from "./common";

// Discount codes (docs/specs/discount-codes.md). Amounts are paisa in whole rupees; the admin form shows rupees.

export const DISCOUNT_KINDS = ["PERCENT", "FIXED"] as const;
export type DiscountKindInput = (typeof DISCOUNT_KINDS)[number];

export const DISCOUNT_CODE_PATTERN = /^[A-Z0-9-]{3,24}$/;

/** "This code isn't valid." is also what the server says for an unknown code, so a typo and a guess look alike. */
export const DISCOUNT_CODE_INVALID = "This code isn't valid.";

/** What a customer types at checkout: any case, spaces around it ignored, matched upper-case. */
export const discountCodeInputSchema = z
  .string({ error: "Enter a discount code" })
  .trim()
  .toUpperCase()
  .min(1, { error: "Enter a discount code" })
  .regex(DISCOUNT_CODE_PATTERN, { error: DISCOUNT_CODE_INVALID });

/** The checkout's "Add a discount code" form. */
export const discountCodeFormSchema = z.strictObject({ code: discountCodeInputSchema });
export type DiscountCodeFormInput = z.input<typeof discountCodeFormSchema>;

const AMOUNT_ERROR = "Enter an amount in rupees, e.g. 500";
const wholeRupees = (error: string) =>
  z
    .int({ error })
    .min(100, { error: "Enter at least Rs 1" })
    .max(1_000_000_000, { error: "Enter an amount under Rs 1 crore" })
    .multipleOf(100, { error: "Enter whole rupees" });

const PERCENT_ERROR = "Enter a percentage from 1 to 100";
const USES_ERROR = "Enter a whole number, 1 or more";

/** The admin "Add a discount code" form. The code can't change after it's made (discountService.save). */
export const discountCodeSchema = z
  .strictObject({
    id: idSchema.optional(),
    code: z
      .string({ error: "Enter a code" })
      .trim()
      .toUpperCase()
      .min(1, { error: "Enter a code" })
      .regex(DISCOUNT_CODE_PATTERN, { error: "Use 3 to 24 letters, numbers or hyphens" }),
    kind: z.enum(DISCOUNT_KINDS, { error: "Choose a type" }),
    percentOff: z
      .int({ error: PERCENT_ERROR })
      .min(1, { error: PERCENT_ERROR })
      .max(100, { error: PERCENT_ERROR })
      .optional(),
    amountOffPaisa: wholeRupees(AMOUNT_ERROR).optional(),
    minSubtotalPaisa: wholeRupees(AMOUNT_ERROR).optional(),
    /** A date (YYYY-MM-DD): the code works until the end of that day in Nepal time. Blank = no end. */
    endsOn: z.iso.date({ error: "Choose a date" }).optional().or(z.literal("")),
    maxUses: z.int({ error: USES_ERROR }).min(1, { error: USES_ERROR }).max(1_000_000).optional(),
    oncePerCustomer: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "PERCENT" && value.percentOff === undefined)
      ctx.addIssue({ code: "custom", path: ["percentOff"], message: PERCENT_ERROR });
    if (value.kind === "FIXED" && value.amountOffPaisa === undefined)
      ctx.addIssue({ code: "custom", path: ["amountOffPaisa"], message: AMOUNT_ERROR });
  });
export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;
