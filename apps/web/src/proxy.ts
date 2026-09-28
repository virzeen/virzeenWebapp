import { NextResponse, type NextRequest } from "next/server";

// Request-level protection (runs before rendering). Real authorization happens again inside every page,
// action and route (security-policy.md §3); this layer only adds the CSP nonce and fast redirects.

const SESSION_COOKIES = ["vz.session_token", "__Secure-vz.session_token"];

const originOf = (url: string | undefined, fallback: string) => {
  try {
    return new URL(url ?? fallback).origin;
  } catch {
    return fallback;
  }
};

// The eSewa form target differs between sandbox and production, so it comes from the environment.
const ESEWA_FORM_ORIGIN = originOf(process.env.ESEWA_BASE_URL, "https://rc-epay.esewa.com.np");
const IS_HTTPS = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Radix and toasts set inline style attributes; scripts stay nonce-only.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com`,
    "font-src 'self'",
    "connect-src 'self' https://api.cloudinary.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // Checkout posts the signed eSewa form; Google sign-in redirects.
    `form-action 'self' ${ESEWA_FORM_ORIGIN} https://accounts.google.com`,
    "frame-ancestors 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    IS_HTTPS ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  // Fast path: guests never see account/checkout/admin pages (each page re-checks the session itself).
  if (!hasSession && /^\/(account|checkout(?!\/(success|failed))|admin)(\/|$)/.test(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|brand|placeholder|sw.js|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
