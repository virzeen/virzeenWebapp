// Better Auth / rate-limit errors → copy from docs/ui/content-style.md.

type AuthError = { code?: string | undefined; status?: number | undefined; message?: string | undefined };

export function authErrorMessage(error: AuthError, email?: string): string {
  const code = (error.code ?? "").toUpperCase();
  if (error.status === 429 || code === "RATE_LIMITED" || code === "TOO_MANY_ATTEMPTS") {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (code === "INVALID_OTP" || code === "INVALID_CODE") {
    return email
      ? `Enter the 6-digit code we sent to ${email}`
      : "That code isn't right. Check it and try again.";
  }
  if (code === "OTP_EXPIRED") return "That code has expired. Send a new one.";
  if (code.includes("EMAIL")) return "Enter a valid email address";
  return "Something went wrong on our side. Please try again.";
}
