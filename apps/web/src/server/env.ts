import "server-only";
import { createEnvSchema } from "./env-schema";

// Validated environment (rules in env-schema.ts). Importing this module fails fast when something required is
// missing or malformed. Values are never logged.

function parseEnv() {
  const result = createEnvSchema(process.env.NODE_ENV).safeParse(process.env);
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
