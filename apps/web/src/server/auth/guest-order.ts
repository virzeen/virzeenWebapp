import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/server/env";

// A guest has no account, so their confirmation page opens with a signed cookie set when the order is placed
// (specs/checkout-v2-week1.md). The cookie names one order number and expires; guessing an order number is not enough.

const COOKIE = "vz_guest_order";
const LIFETIME_MS = 24 * 60 * 60 * 1000;

function sign(orderNumber: string, expiresAt: number): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`guest-order:${orderNumber}:${expiresAt}`)
    .digest("base64url");
}

/** Sets the cookie. Only in Server Actions / Route Handlers. */
export async function grantGuestOrderAccess(orderNumber: string): Promise<void> {
  const expiresAt = Date.now() + LIFETIME_MS;
  (await cookies()).set(COOKIE, `${orderNumber}.${expiresAt}.${sign(orderNumber, expiresAt)}`, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LIFETIME_MS / 1000,
  });
}

/** True when this browser holds a valid, unexpired cookie for exactly this order. */
export async function hasGuestOrderAccess(orderNumber: string): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  const [number, expires, signature] = value?.split(".") ?? [];
  if (!number || !expires || !signature || number !== orderNumber) return false;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = Buffer.from(sign(number, expiresAt));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
