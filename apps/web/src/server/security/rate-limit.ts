import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AppError } from "@virzeen/core";
import { headers } from "next/headers";
import { env } from "@/server/env";
import { ipRateLimitKey, trustedClientIp } from "./client-ip";

// Rate limits from docs/security/security-policy.md §6. Upstash in production; in-memory for local dev.

type Window = `${number} ${"s" | "m" | "h"}`;
const LIMITS = {
  "otp:email": [3, "10 m"],
  "otp:ip": [10, "10 m"],
  "login:email": [5, "10 m"],
  "cart:add": [60, "1 m"],
  "cart:write": [120, "1 m"],
  checkout: [10, "10 m"],
  "payment:callback": [30, "1 m"],
  api: [120, "1 m"],
  "admin:totp": [5, "10 m"],
  account: [30, "10 m"],
  favourite: [60, "1 m"],
  admin: [240, "1 m"],
} as const satisfies Record<string, readonly [number, Window]>;

export type LimitName = keyof typeof LIMITS;

const windowMs = (window: Window) => {
  const [amount, unit] = window.split(" ") as [string, "s" | "m" | "h"];
  return Number(amount) * { s: 1_000, m: 60_000, h: 3_600_000 }[unit];
};

// ── In-memory sliding window (development / single instance only) ──
const memory = new Map<string, number[]>();
function memoryLimit(name: LimitName, key: string): boolean {
  const [max, window] = LIMITS[name];
  const now = Date.now();
  const bucketKey = `${name}:${key}`;
  const hits = (memory.get(bucketKey) ?? []).filter((t) => t > now - windowMs(window));
  if (hits.length >= max) {
    memory.set(bucketKey, hits);
    return false;
  }
  hits.push(now);
  memory.set(bucketKey, hits);
  return true;
}

// ── Upstash ──
const limiters = new Map<LimitName, Ratelimit>();
function upstashLimiter(name: LimitName): Ratelimit {
  let limiter = limiters.get(name);
  if (!limiter) {
    const [max, window] = LIMITS[name];
    limiter = new Ratelimit({
      redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL ?? "", token: env.UPSTASH_REDIS_REST_TOKEN ?? "" }),
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `vz:rl:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/** Throws RATE_LIMITED when `key` has used up the `name` budget. */
export async function rateLimit(name: LimitName, key: string): Promise<void> {
  const allowed =
    env.RATE_LIMIT_STORE === "upstash"
      ? (await upstashLimiter(name).limit(key)).success
      : memoryLimit(name, key);
  if (!allowed)
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
}

/** Client IP as a rate-limit key (see client-ip.ts). Never logged. */
export async function clientIp(): Promise<string> {
  const ip = trustedClientIp(await headers());
  return ip ? ipRateLimitKey(ip) : "unknown";
}
