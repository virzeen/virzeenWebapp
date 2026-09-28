import { z } from "zod";

// Environment schema (docs/architecture.md "Environment variables"). Pure, so it can be tested; env.ts
// parses process.env with it at startup.
//
// Always required: site URL, database, auth secret, email sender, cron secret, plus the keys for the chosen
// email transport and rate-limit store. Optional features (Google sign-in, eSewa, Khalti, Cloudinary uploads,
// Sentry) switch themselves off when their keys are missing, so the shop can launch with COD while merchant
// approvals are pending (project-brief.md §18).
//
// The live site (a production build on a real domain) must use https, Resend, Upstash and the live payment
// endpoints. Otherwise sandbox payments, which anyone can make with eSewa's public test account, would mark
// real orders paid. A staging site on sandbox keys sets ALLOW_SANDBOX_PAYMENTS=true.

const LIVE_PAYMENT_HOSTS = {
  ESEWA_BASE_URL: "epay.esewa.com.np",
  ESEWA_STATUS_URL: "esewa.com.np",
  KHALTI_BASE_URL: "khalti.com",
} as const;

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export function createEnvSchema(nodeEnv: string | undefined) {
  const isProduction = nodeEnv === "production";
  return z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      NEXT_PUBLIC_SITE_URL: z.url(),
      DATABASE_URL: z.url(),

      BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
      BETTER_AUTH_URL: z.url(),
      GOOGLE_CLIENT_ID: optional,
      GOOGLE_CLIENT_SECRET: optional,

      ESEWA_PRODUCT_CODE: optional,
      ESEWA_SECRET_KEY: optional,
      ESEWA_BASE_URL: z.url().default("https://rc-epay.esewa.com.np"),
      ESEWA_STATUS_URL: z.url().default("https://rc.esewa.com.np"),
      KHALTI_SECRET_KEY: optional,
      KHALTI_BASE_URL: z.url().default("https://dev.khalti.com/api/v2"),
      ALLOW_SANDBOX_PAYMENTS: z.stringbool().default(false),

      CLOUDINARY_CLOUD_NAME: optional,
      CLOUDINARY_API_KEY: optional,
      CLOUDINARY_API_SECRET: optional,

      EMAIL_TRANSPORT: z.enum(["resend", "mailpit"]).default(isProduction ? "resend" : "mailpit"),
      RESEND_API_KEY: optional,
      EMAIL_FROM: z.string().min(3),
      MAILPIT_URL: z.url().default("http://localhost:8025"),
      OWNER_ALERT_EMAIL: z.email(),

      RATE_LIMIT_STORE: z.enum(["upstash", "memory"]).default(isProduction ? "upstash" : "memory"),
      UPSTASH_REDIS_REST_URL: optional,
      UPSTASH_REDIS_REST_TOKEN: optional,

      CRON_SECRET: z.string().min(24, "CRON_SECRET must be at least 24 characters"),
      SENTRY_DSN: optional,
      SEED_ADMIN_EMAIL: optional,
    })
    .superRefine((env, ctx) => {
      const problem = (key: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [key], message });
      const need = (condition: boolean, key: string, why: string) => {
        if (condition && !(env as Record<string, unknown>)[key]) problem(key, `${key} is required ${why}`);
      };
      need(env.EMAIL_TRANSPORT === "resend", "RESEND_API_KEY", "when EMAIL_TRANSPORT=resend");
      need(env.RATE_LIMIT_STORE === "upstash", "UPSTASH_REDIS_REST_URL", "when RATE_LIMIT_STORE=upstash");
      need(env.RATE_LIMIT_STORE === "upstash", "UPSTASH_REDIS_REST_TOKEN", "when RATE_LIMIT_STORE=upstash");
      need(Boolean(env.GOOGLE_CLIENT_ID), "GOOGLE_CLIENT_SECRET", "with GOOGLE_CLIENT_ID");
      need(Boolean(env.ESEWA_PRODUCT_CODE), "ESEWA_SECRET_KEY", "with ESEWA_PRODUCT_CODE");
      need(Boolean(env.CLOUDINARY_CLOUD_NAME), "CLOUDINARY_API_KEY", "with CLOUDINARY_CLOUD_NAME");
      need(Boolean(env.CLOUDINARY_CLOUD_NAME), "CLOUDINARY_API_SECRET", "with CLOUDINARY_CLOUD_NAME");

      if (!isLiveSite(env)) return;
      const onLive = "on the live site";
      if (!env.NEXT_PUBLIC_SITE_URL.startsWith("https://"))
        problem("NEXT_PUBLIC_SITE_URL", `must use https ${onLive}`);
      if (!env.BETTER_AUTH_URL.startsWith("https://")) problem("BETTER_AUTH_URL", `must use https ${onLive}`);
      if (env.EMAIL_TRANSPORT !== "resend") problem("EMAIL_TRANSPORT", `must be resend ${onLive}`);
      if (env.RATE_LIMIT_STORE !== "upstash") problem("RATE_LIMIT_STORE", `must be upstash ${onLive}`);
      if (env.ALLOW_SANDBOX_PAYMENTS) return;
      const sandbox =
        "points at the payment sandbox; set the live URL (or ALLOW_SANDBOX_PAYMENTS=true on staging)";
      if (env.ESEWA_PRODUCT_CODE) {
        if (env.ESEWA_PRODUCT_CODE === "EPAYTEST") {
          problem(
            "ESEWA_PRODUCT_CODE",
            "is eSewa's public test code; use your merchant code on the live site",
          );
        }
        if (hostOf(env.ESEWA_BASE_URL) !== LIVE_PAYMENT_HOSTS.ESEWA_BASE_URL)
          problem("ESEWA_BASE_URL", sandbox);
        if (hostOf(env.ESEWA_STATUS_URL) !== LIVE_PAYMENT_HOSTS.ESEWA_STATUS_URL)
          problem("ESEWA_STATUS_URL", sandbox);
      }
      if (env.KHALTI_SECRET_KEY && hostOf(env.KHALTI_BASE_URL) !== LIVE_PAYMENT_HOSTS.KHALTI_BASE_URL) {
        problem("KHALTI_BASE_URL", sandbox);
      }
    });
}

const hostOf = (url: string) => new URL(url).hostname;

/** A production build serving a real domain. Local production builds (e2e tests, `next start`) are not. */
export function isLiveSite(env: { NODE_ENV: string; NEXT_PUBLIC_SITE_URL: string }): boolean {
  return env.NODE_ENV === "production" && !LOCAL_HOSTS.includes(hostOf(env.NEXT_PUBLIC_SITE_URL));
}

export type Env = z.infer<ReturnType<typeof createEnvSchema>>;
