// Environment for the e2e server: its own database, port and mocked payment providers.
export const E2E_PORT = 3100;
export const MOCK_PORT = 4010;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://virzeen:virzeen@localhost:5434/virzeen_e2e";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";
export const E2E_ADMIN_EMAIL = "e2e-admin@example.com";

export const E2E_ENV: Record<string, string> = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: E2E_BASE_URL,
  BETTER_AUTH_URL: E2E_BASE_URL,
  BETTER_AUTH_SECRET: "e2e-only-secret-e2e-only-secret-e2e-only-secret",
  DATABASE_URL: E2E_DATABASE_URL,
  ESEWA_PRODUCT_CODE: "EPAYTEST",
  ESEWA_SECRET_KEY: "8gBm/:&EnhH.1/q",
  ESEWA_BASE_URL: `http://localhost:${MOCK_PORT}`,
  ESEWA_STATUS_URL: `http://localhost:${MOCK_PORT}`,
  KHALTI_SECRET_KEY: "test_secret_key",
  KHALTI_BASE_URL: `http://localhost:${MOCK_PORT}/khalti/api/v2`,
  EMAIL_TRANSPORT: "mailpit",
  MAILPIT_URL,
  EMAIL_FROM: "Virzeen <orders@example.com>",
  OWNER_ALERT_EMAIL: "owner@example.com",
  RATE_LIMIT_STORE: "memory",
  CRON_SECRET: "e2e-cron-secret-e2e-cron-secret",
  SEED_ADMIN_EMAIL: E2E_ADMIN_EMAIL,
  // Keep the e2e build out of the dev server's .next folder.
  NEXT_DIST_DIR: ".next-e2e",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  RESEND_API_KEY: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  SENTRY_DSN: "",
};
