// Closed list of error codes (docs/backend/backend-policies.md §3). Adding a code means updating
// this file, backend-policies.md §3 and api-contract.md together.
export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "OUT_OF_STOCK",
  "PRICE_CHANGED",
  "CART_EMPTY",
  "PAYMENT_FAILED",
  "PAYMENT_PENDING",
  "PAYMENT_AMOUNT_MISMATCH",
  "INVALID_STATE_TRANSITION",
  "RATE_LIMITED",
  "CONFLICT",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly meta: Record<string, unknown> | undefined;
  /** Field → message, only for VALIDATION_FAILED so forms can show errors under inputs. */
  readonly fields: Record<string, string> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { meta?: Record<string, unknown>; fields?: Record<string, string> },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.meta = options?.meta;
    this.fields = options?.fields;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Postgres unique violation surfaced by Prisma (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
