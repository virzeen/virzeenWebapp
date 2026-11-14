import { z } from "zod";
import { requiredText } from "./common";

export const emailSchema = z
  .string({ error: "Enter a valid email address" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }).max(254));

export const requestOtpSchema = z.strictObject({ email: emailSchema });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.strictObject({
  email: emailSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "Enter the 6-digit code we sent to your email" }),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const totpCodeSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "Enter the 6-digit code from your authenticator app" }),
});

export const profileSchema = z.strictObject({
  name: z.string().trim().min(1, { error: "Enter your name" }).max(100),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Only same-site relative paths may be used as a post-login destination (open-redirect guard). */
export const safeRedirectSchema = z
  .string()
  .regex(/^\/(?!\/)[\w\-/?=&.%]*$/)
  .catch("/");

/** What a member shops for (create-account step). */
export const SHOPPING_PREFERENCES = ["HOME", "CLOTHING", "BOTH"] as const;
export type ShoppingPreferenceInput = (typeof SHOPPING_PREFERENCES)[number];
export const SHOPPING_PREFERENCE_LABELS: Record<ShoppingPreferenceInput, string> = {
  HOME: "Home",
  CLOTHING: "Clothing",
  BOTH: "Both",
};

const TERMS_ERROR = "Agree to the Privacy Policy and Terms of Use to continue";

/**
 * The create-account step (docs/checkoutfeatures.md §3.4, specs/sign-in-v2.md): name, shopping preference, an optional
 * birthday ("YYYY-MM-DD", not in the future), the marketing tick and the required terms tick. No password here: that is
 * set later in Settings.
 */
export const signupDetailsSchema = z.strictObject({
  firstName: requiredText("first name", 50),
  lastName: requiredText("last name", 50),
  preference: z.enum(SHOPPING_PREFERENCES, { error: "Choose your shopping preference" }),
  birthday: z
    .union([z.literal(""), z.iso.date({ error: "Enter a valid date" })])
    .optional()
    .refine((value) => !value || (value >= "1900-01-01" && value <= new Date().toISOString().slice(0, 10)), {
      error: "Enter a valid date",
    }),
  marketingOptIn: z.boolean(),
  termsAccepted: z.literal(true, { error: TERMS_ERROR }),
});
export type SignupDetailsInput = z.input<typeof signupDetailsSchema>;

/** A password is optional and set in Settings: at least 8 characters (docs/checkoutfeatures.md §8). */
export const passwordSchema = z
  .string({ error: "Enter a password" })
  .min(8, { error: "Use at least 8 characters" })
  .max(128, { error: "Keep the password under 128 characters" });

export const passwordSignInSchema = z.strictObject({
  email: emailSchema,
  password: z.string({ error: "Enter your password" }).min(1, { error: "Enter your password" }).max(128),
});
export type PasswordSignInInput = z.infer<typeof passwordSignInSchema>;

/** Set a first password (no current one), or change it (current required). */
export const setPasswordSchema = z.strictObject({
  currentPassword: z.string().max(128).optional(),
  newPassword: passwordSchema,
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
