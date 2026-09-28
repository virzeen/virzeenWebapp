// Better Auth / rate-limit errors → copy from docs/ui/content-style.md.

export type AuthError = {
  code?: string | undefined;
  status?: number | undefined;
  message?: string | undefined;
};

const codeOf = (error: AuthError) => (error.code ?? "").toUpperCase();

// Our OTP limiter (app/api/auth/[...all]/route.ts) answers 429 RATE_LIMITED; Better Auth's own limiter a bare 429.
const isRateLimited = (error: AuthError) => error.status === 429 || codeOf(error) === "RATE_LIMITED";
const isWrongCode = (code: string) => code === "INVALID_OTP" || code === "INVALID_CODE";

// `email` is no longer used (the wrong-code message doesn't repeat the address); this signature keeps
// login-form.tsx compiling until its call drops it.
export function authErrorMessage(error: AuthError, email?: string): string;
export function authErrorMessage(error: AuthError): string {
  const code = codeOf(error);
  if (isRateLimited(error)) return "Too many attempts. Please wait a minute and try again.";
  if (code === "TOO_MANY_ATTEMPTS") return "Too many wrong codes. Send a new code to try again.";
  if (isWrongCode(code)) return "That code isn't right. Check it and try again.";
  if (code === "OTP_EXPIRED") return "That code has expired. Send a new one.";
  if (code.includes("EMAIL")) return "Enter a valid email address";
  return "Something went wrong on our side. Please try again.";
}

/**
 * Where a failed sign-in code check shows on /verify (docs/specs/sign-in-code.md): under the code field
 * (`wrong`, `expired`, and `locked`, which also shuts the field until a new code is sent) or in the Alert (`other`).
 */
export type CodeCheckFailure = "wrong" | "expired" | "locked" | "other";

export function codeCheckFailure(error: AuthError): CodeCheckFailure {
  if (isRateLimited(error)) return "other";
  const code = codeOf(error);
  if (isWrongCode(code)) return "wrong";
  if (code === "OTP_EXPIRED") return "expired";
  // Better Auth emailOTP, 403: the try after `allowedAttempts` wrong codes. It has deleted that code.
  if (code === "TOO_MANY_ATTEMPTS") return "locked";
  return "other";
}
