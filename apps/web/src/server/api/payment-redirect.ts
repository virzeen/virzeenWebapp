import "server-only";
import "@/server/bootstrap";
import * as Sentry from "@sentry/nextjs";
import { isAppError, type VerifyResult } from "@virzeen/core";
import { NextResponse } from "next/server";
import { siteUrl } from "@/server/env";
import { logger } from "@/server/logger";
import { clientIp, rateLimit } from "@/server/security/rate-limit";
import { sendDueStockAlerts } from "@/server/services/stock-alerts";

// Provider return URLs are untrusted hints (payment-policy.md §1.2): routes only parse, call core, redirect.

/**
 * Where the customer lands (specs/payment-window.md): the order closed unpaid → the failed page (the bag is back);
 * this attempt didn't go through but the order still waits → its page with Pay now; a payment that came after the
 * order closed → its page, which says it's being refunded; otherwise the success page (paid, or still confirming).
 */
export function redirectFor(result: VerifyResult | null) {
  if (!result) return NextResponse.redirect(`${siteUrl}/checkout/failed`, 303);
  const order = result.orderNumber;
  const target =
    result.outcome === "FAILED" || result.outcome === "EXPIRED"
      ? `/checkout/failed?order=${order}`
      : result.outcome === "RETRY"
        ? `/account/orders/${order}?payment=failed`
        : result.outcome === "LATE"
          ? `/account/orders/${order}`
          : `/checkout/success?order=${order}`;
  return NextResponse.redirect(`${siteUrl}${target}`, 303);
}

/** Rate-limits, runs the handler and turns any problem into the friendly failed page (never a stack trace). */
export async function handleProviderReturn(provider: string, run: () => Promise<VerifyResult | null>) {
  try {
    await rateLimit("payment:callback", await clientIp());
    // A failed or expired payment returns the order's stock ("Notify me", specs/notify-me.md).
    sendDueStockAlerts();
    return redirectFor(await run());
  } catch (error) {
    if (!isAppError(error)) Sentry.captureException(error, { tags: { provider } });
    logger.warn("payment return rejected", { provider, code: isAppError(error) ? error.code : "INTERNAL" });
    return NextResponse.redirect(`${siteUrl}/checkout/failed`, 303);
  }
}
