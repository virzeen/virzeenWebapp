import { NextResponse, type NextRequest } from "next/server";

// Request-level protection (runs before rendering). Real authorization happens again inside every page,
// action and route (security-policy.md §3); this layer only adds the CSP nonce and fast redirects.

const SESSION_COOKIES = ["vz.session_token", "__Secure-vz.session_token"];

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
    "form-action 'self' https://rc-epay.esewa.com.np https://epay.esewa.com.np https://accounts.google.com",
    "frame-ancestors 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    isDev ? "" : "upgrade-insecure-requests",
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
