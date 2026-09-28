import "server-only";
import "@/server/bootstrap";
import { notifications } from "@virzeen/core";
import { db } from "@virzeen/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { env, features, siteUrl } from "@/server/env";
import { CLIENT_IP_HEADER } from "@/server/security/client-ip";

// Better Auth (docs/security/security-policy.md §2): Google + email OTP, no customer passwords.
// Admin TOTP is enrolled with the two-factor plugin and enforced per session by requireAdmin()
// (the plugin itself only challenges password sign-ins).

// Local development only: sign-in codes are also printed in the dev-server terminal (owner exception to
// security-policy.md §9). Never true in production or when the site URL is not localhost.
const printCodesInTerminal =
  env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(siteUrl).hostname);

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
    // Set by app/api/auth/[...all]/route.ts from the same trusted IP our own limiter uses. Without a readable
    // client IP Better Auth puts every visitor in one shared rate-limit bucket.
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
  },
  // General limit for everything else. The two email-code endpoints are limited per email and per IP by our
  // own limiter (app/api/auth/[...all]/route.ts, security-policy.md §6); Better Auth's built-in 3-per-minute
  // rule for them would block real customers signing in at the same time, so it is switched off.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: { "/email-otp/send-verification-otp": false, "/sign-in/email-otp": false },
  },
  trustedOrigins: [env.NEXT_PUBLIC_SITE_URL],
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp }) {
        if (printCodesInTerminal)
          console.warn(`\n  Sign-in code for ${email}: ${otp} (expires in 10 minutes)\n`);
        await notifications.sendOtp(email, otp);
      },
    }),
    twoFactor({ issuer: "Virzeen", allowPasswordless: true, skipVerificationOnEnable: false }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
