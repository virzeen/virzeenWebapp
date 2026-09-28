import { z } from "zod";

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
