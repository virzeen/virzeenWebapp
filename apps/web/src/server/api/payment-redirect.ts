import "server-only";
import "@/server/bootstrap";
import * as Sentry from "@sentry/nextjs";
import { isAppError, type VerifyResult } from "@virzeen/core";
import { NextResponse } from "next/server";
import { siteUrl } from "@/server/env";
import { logger } from "@/server/logger";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

// Provider return URLs are untrusted hints (payment-policy.md §1.2): routes only parse, call core, redirect.

export function redirectFor(result: VerifyResult | null) {
  if (!result) return NextResponse.redirect(`${siteUrl}/checkout/failed`, 303);
  const target =
    result.outcome === "FAILED" || result.outcome === "EXPIRED"
      ? `/checkout/failed?order=${result.orderNumber}`
      : `/checkout/success?order=${result.orderNumber}`;
  return NextResponse.redirect(`${siteUrl}${target}`, 303);
}

/** Rate-limits, runs the handler and turns any problem into the friendly failed page (never a stack trace). */
export async function handleProviderReturn(provider: string, run: () => Promise<VerifyResult | null>) {
  try {
    await rateLimit("payment:callback", await clientIp());
    return redirectFor(await run());
  } catch (error) {
    if (!isAppError(error)) Sentry.captureException(error, { tags: { provider } });
    logger.warn("payment return rejected", { provider, code: isAppError(error) ? error.code : "INTERNAL" });
    return NextResponse.redirect(`${siteUrl}/checkout/failed`, 303);
  }
}
