import "@/server/bootstrap";
import { isAppError } from "@virzeen/core";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/auth";
import { CLIENT_IP_HEADER, trustedClientIp } from "@/server/security/client-ip";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

const handler = toNextJsHandler(auth);

// Better Auth reads the client IP only from CLIENT_IP_HEADER (auth.ts); set it here so a visitor can't.
function withClientIp(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP_HEADER);
  const ip = trustedClientIp(request.headers);
  if (ip) headers.set(CLIENT_IP_HEADER, ip);
  // Built from parts: Next's request object can't be passed to the Request constructor.
  const init: RequestInit & { duplex: "half" } = {
    method: request.method,
    headers,
    body: request.body,
    signal: request.signal,
    duplex: "half",
  };
  return new Request(request.url, init);
}

// Only the endpoints our pages use are reachable over HTTP. Everything else Better Auth ships — in particular
// /two-factor/* (enable/disable would let someone with an admin's inbox replace their authenticator) and the
// password-reset endpoints — answers 404. Server code calls `auth.api.*` in-process and is unaffected.
const ALLOWED = {
  GET: [
    /^\/api\/auth\/get-session$/,
    /^\/api\/auth\/callback\/[a-z]+$/,
    /^\/api\/auth\/error$/,
    /^\/api\/auth\/ok$/,
  ],
  POST: [
    /^\/api\/auth\/email-otp\/send-verification-otp$/,
    /^\/api\/auth\/sign-in\/email-otp$/,
    /^\/api\/auth\/sign-in\/social$/,
    /^\/api\/auth\/sign-out$/,
    /^\/api\/auth\/callback\/[a-z]+$/,
  ],
} as const;

const isAllowed = (method: "GET" | "POST", request: Request) =>
  ALLOWED[method].some((pattern) => pattern.test(new URL(request.url).pathname));

const notFound = () => Response.json({ code: "NOT_FOUND", message: "Not found." }, { status: 404 });

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

export async function GET(request: Request) {
  return isAllowed("GET", request) ? handler.GET(withClientIp(request)) : notFound();
}

export async function POST(request: Request) {
  if (!isAllowed("POST", request)) return notFound();
  const limited = await limitOtp(request);
  return limited ?? handler.POST(withClientIp(request));
}
