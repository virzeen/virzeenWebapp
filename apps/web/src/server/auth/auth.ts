import "server-only";
import "@/server/bootstrap";
import { notifications } from "@virzeen/core";
import { db } from "@virzeen/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { env, features } from "@/server/env";

// Better Auth (docs/security/security-policy.md §2): Google + email OTP, no customer passwords.
// Admin TOTP is enrolled with the two-factor plugin and enforced per session by requireAdmin()
// (the plugin itself only challenges password sign-ins).

export const auth = betterAuth({
  appName: "Virzeen",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  socialProviders: features.google
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          prompt: "select_account",
        },
      }
    : {},
  user: {
    additionalFields: {
      role: { type: "string", required: false, input: false, defaultValue: "CUSTOMER" },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
    freshAge: 60 * 60, // sensitive actions need a sign-in within the hour
  },
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  advanced: {
    cookiePrefix: "vz",
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  // Our own Upstash limits wrap the OTP endpoints (app/api/auth/[...all]/route.ts); keep Better Auth's too.
  rateLimit: { enabled: true, window: 60, max: 60 },
  trustedOrigins: [env.NEXT_PUBLIC_SITE_URL],
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp }) {
        await notifications.sendOtp(email, otp);
      },
    }),
    twoFactor({ issuer: "Virzeen", allowPasswordless: true, skipVerificationOnEnable: false }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
