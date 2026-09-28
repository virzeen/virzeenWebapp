import { describe, expect, it } from "vitest";
import { createEnvSchema } from "./env-schema";

// Fake values only.
const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5434/virzeen",
  BETTER_AUTH_SECRET: "s".repeat(32),
  EMAIL_FROM: "Virzeen <orders@example.com>",
  OWNER_ALERT_EMAIL: "owner@example.com",
  CRON_SECRET: "c".repeat(24),
};

const live = {
  ...base,
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://virzeen.example",
  BETTER_AUTH_URL: "https://virzeen.example",
  RESEND_API_KEY: "fake-resend-key",
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "fake-token",
};

const sandboxPayments = {
  ESEWA_PRODUCT_CODE: "EPAYTEST",
  ESEWA_SECRET_KEY: "fake-secret",
  ESEWA_BASE_URL: "https://rc-epay.esewa.com.np",
  ESEWA_STATUS_URL: "https://rc.esewa.com.np",
  KHALTI_SECRET_KEY: "fake-khalti",
  KHALTI_BASE_URL: "https://dev.khalti.com/api/v2",
};

/** Names of the variables that fail validation. */
function problems(input: Record<string, string>): string[] {
  const result = createEnvSchema(input.NODE_ENV).safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("environment validation", () => {
  it("accepts local development with sandbox payments, Mailpit and the memory limiter", () => {
    const local = {
      ...base,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      BETTER_AUTH_URL: "http://localhost:3000",
    };
    expect(problems({ ...local, NODE_ENV: "development", ...sandboxPayments })).toEqual([]);
  });

  it("accepts a local production build (e2e tests) with sandbox settings", () => {
    const e2e = {
      ...base,
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
      BETTER_AUTH_URL: "http://localhost:3100",
      EMAIL_TRANSPORT: "mailpit",
      RATE_LIMIT_STORE: "memory",
    };
    expect(problems({ ...e2e, ...sandboxPayments })).toEqual([]);
  });

  it("refuses sandbox payments on the live site", () => {
    expect(problems({ ...live, ...sandboxPayments }).sort()).toEqual([
      "ESEWA_BASE_URL",
      "ESEWA_PRODUCT_CODE",
      "ESEWA_STATUS_URL",
      "KHALTI_BASE_URL",
    ]);
  });

  it("accepts the live payment endpoints on the live site", () => {
    expect(
      problems({
        ...live,
        ESEWA_PRODUCT_CODE: "VIRZEEN",
        ESEWA_SECRET_KEY: "fake-secret",
        ESEWA_BASE_URL: "https://epay.esewa.com.np",
        ESEWA_STATUS_URL: "https://esewa.com.np",
        KHALTI_SECRET_KEY: "fake-khalti",
        KHALTI_BASE_URL: "https://khalti.com/api/v2",
      }),
    ).toEqual([]);
  });

  it("lets a staging site opt into sandbox payments explicitly", () => {
    expect(problems({ ...live, ...sandboxPayments, ALLOW_SANDBOX_PAYMENTS: "true" })).toEqual([]);
  });

  it("launches without payment keys (cash on delivery only)", () => {
    expect(problems(live)).toEqual([]);
  });

  it("requires https, Resend and Upstash on the live site", () => {
    expect(
      problems({
        ...live,
        BETTER_AUTH_URL: "http://virzeen.example",
        EMAIL_TRANSPORT: "mailpit",
        RATE_LIMIT_STORE: "memory",
      }).sort(),
    ).toEqual(["BETTER_AUTH_URL", "EMAIL_TRANSPORT", "RATE_LIMIT_STORE"]);
  });
});
