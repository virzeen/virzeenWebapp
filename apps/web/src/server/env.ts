import "server-only";
import { z } from "zod";

// Validated environment (docs/architecture.md "Environment variables"). Importing this module fails fast
// when something required is missing or malformed. Values are never logged.
//
// Always required: site URL, database, auth secret, email sender, cron secret, plus the keys for the chosen
// email transport and rate-limit store. Optional features (Google sign-in, eSewa, Khalti, Cloudinary uploads,
// Sentry) switch themselves off when their keys are missing, so the shop can launch with COD while merchant
// approvals are pending (project-brief.md §18).

const isProduction = process.env.NODE_ENV === "production";
const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z
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
    const need = (condition: boolean, key: string, why: string) => {
      if (condition && !(env as Record<string, unknown>)[key]) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required ${why}` });
      }
    };
    need(env.EMAIL_TRANSPORT === "resend", "RESEND_API_KEY", "when EMAIL_TRANSPORT=resend");
    need(env.RATE_LIMIT_STORE === "upstash", "UPSTASH_REDIS_REST_URL", "when RATE_LIMIT_STORE=upstash");
    need(env.RATE_LIMIT_STORE === "upstash", "UPSTASH_REDIS_REST_TOKEN", "when RATE_LIMIT_STORE=upstash");
    need(Boolean(env.GOOGLE_CLIENT_ID), "GOOGLE_CLIENT_SECRET", "with GOOGLE_CLIENT_ID");
    need(Boolean(env.ESEWA_PRODUCT_CODE), "ESEWA_SECRET_KEY", "with ESEWA_PRODUCT_CODE");
    need(Boolean(env.CLOUDINARY_CLOUD_NAME), "CLOUDINARY_API_KEY", "with CLOUDINARY_CLOUD_NAME");
    need(Boolean(env.CLOUDINARY_CLOUD_NAME), "CLOUDINARY_API_SECRET", "with CLOUDINARY_CLOUD_NAME");
  });

function parseEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables (see .env.example):\n${problems}`);
  }
  return result.data;
}

export const env = parseEnv();

/** Which optional features are switched on by configuration. */
export const features = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  esewa: Boolean(env.ESEWA_PRODUCT_CODE && env.ESEWA_SECRET_KEY),
  khalti: Boolean(env.KHALTI_SECRET_KEY),
  cloudinary: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  sentry: Boolean(env.SENTRY_DSN),
};

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
