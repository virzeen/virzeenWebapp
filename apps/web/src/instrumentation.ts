import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate env and configure @virzeen/core before the first request.
    await import("./server/bootstrap");
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
