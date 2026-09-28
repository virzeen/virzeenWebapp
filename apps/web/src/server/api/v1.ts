import "server-only";
import "@/server/bootstrap";
import * as Sentry from "@sentry/nextjs";
import { isAppError, type ErrorCode } from "@virzeen/core";
import { ZodError } from "zod";
import { siteUrl } from "@/server/env";
import { logger } from "@/server/logger";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

// Shared plumbing for /api/v1 (docs/backend/api-contract.md): { data } on success, { error } on failure.

const STATUS: Partial<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PRICE_CHANGED: 409,
  OUT_OF_STOCK: 409,
  INVALID_STATE_TRANSITION: 409,
  CART_EMPTY: 409,
  PAYMENT_FAILED: 409,
  PAYMENT_PENDING: 409,
  PAYMENT_AMOUNT_MISMATCH: 409,
  RATE_LIMITED: 429,
};

type Handler<C> = (request: Request, context: C) => Promise<unknown>;

function errorResponse(code: ErrorCode, message: string, status: number, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

/** Mutations must come from our own origin (the Capacitor shell loads the same site). */
function sameOrigin(request: Request): boolean {
  if (["GET", "HEAD"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(siteUrl).origin;
}

/** Wraps a v1 handler: rate-limit → run → map errors to the contract's HTTP statuses. */
export function apiHandler<C>(name: string, handler: Handler<C>, successStatus = 200) {
  return async (request: Request, context: C): Promise<Response> => {
    try {
      if (!sameOrigin(request)) return errorResponse("FORBIDDEN", "Cross-origin request refused.", 403);
      await rateLimit("api", await clientIp());
      const data = await handler(request, context);
      return Response.json(data !== null && typeof data === "object" && "data" in data ? data : { data }, {
        status: successStatus,
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const fields = Object.fromEntries(error.issues.map((i) => [i.path.join(".") || "_", i.message]));
        return errorResponse("VALIDATION_FAILED", "Please check the request.", 400, fields);
      }
      if (isAppError(error)) {
        return errorResponse(error.code, error.message, STATUS[error.code] ?? 500, error.fields);
      }
      logger.error("api v1 failed", {
        route: name,
        error: error instanceof Error ? error.message : String(error),
      });
      Sentry.captureException(error, { tags: { route: name } });
      return errorResponse("INTERNAL", "Something went wrong on our side. Please try again.", 500);
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
