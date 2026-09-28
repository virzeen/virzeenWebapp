import "@/server/bootstrap";
import { isAppError } from "@virzeen/core";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/auth";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

const handler = toNextJsHandler(auth);

// OTP abuse limits (security-policy.md §6) applied before Better Auth sees the request.
async function limitOtp(request: Request): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const isSend = path.endsWith("/email-otp/send-verification-otp");
  const isVerify = path.endsWith("/sign-in/email-otp");
  if (!isSend && !isVerify) return null;

  let email = "unknown";
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    if (typeof body.email === "string") email = body.email.trim().toLowerCase().slice(0, 254);
  } catch {
    // Malformed body: Better Auth rejects it; still count the attempt against the IP.
  }
  try {
    if (isSend) {
      await rateLimit("otp:ip", await clientIp());
      await rateLimit("otp:email", email);
    } else {
      await rateLimit("login:email", email);
    }
    return null;
  } catch (error) {
    if (isAppError(error) && error.code === "RATE_LIMITED") {
      return Response.json({ code: "RATE_LIMITED", message: error.message }, { status: 429 });
    }
    throw error;
  }
}

export const GET = handler.GET;

export async function POST(request: Request) {
  const limited = await limitOtp(request);
  return limited ?? handler.POST(request);
}
