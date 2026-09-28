import "server-only";
import "@/server/bootstrap";
import * as Sentry from "@sentry/nextjs";
import { isAppError, type ErrorCode } from "@virzeen/core";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { logger } from "@/server/logger";

// Every Server Action returns this shape and never throws to the client (backend-policies.md §3).
export type ActionError = { code: ErrorCode; message: string; fields?: Record<string, string> };
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

function fieldsFrom(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Runs an action body (authenticate → authorize → rate-limit → validate → core) and maps errors:
 * AppError → its code, ZodError → VALIDATION_FAILED with field messages, anything else → INTERNAL (logged + Sentry).
 * redirect()/notFound() pass through untouched.
 */
export async function runAction<T>(name: string, body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ZodError) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Please check the highlighted fields.",
          fields: fieldsFrom(error),
        },
      };
    }
    if (isAppError(error)) {
      return {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      };
    }
    logger.error("action failed", {
      action: name,
      error: error instanceof Error ? error.message : String(error),
    });
    Sentry.captureException(error, { tags: { action: name } });
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." },
    };
  }
}
