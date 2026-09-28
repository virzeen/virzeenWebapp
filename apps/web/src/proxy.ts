import { colors } from "@virzeen/ui/tokens";
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

// The live site also answers on its Railway address. Pages there redirect to the real domain, so there's one
// canonical host and nobody browses around Cloudflare. /api stays reachable (outside the matcher) for Railway.
// Read the Host header: behind Railway, request.nextUrl carries the server's own internal address.
const SITE_ORIGIN = IS_HTTPS ? originOf(process.env.NEXT_PUBLIC_SITE_URL, "") : "";
const isRailwayHost = (host: string | null) => (host ?? "").split(":")[0]!.endsWith(".up.railway.app");

// Maintenance mode (docs/runbooks/restore-backup.md): set MAINTENANCE_MODE=true in Railway and redeploy.
// Every page answers 503 with this notice and no database access; /api/health is outside the matcher.
const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
const MAINTENANCE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Virzeen — back soon</title></head>
<body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:${colors.canvas};color:${colors.ink};font-family:system-ui,sans-serif;text-align:center;padding:16px">
<main><p style="letter-spacing:0.3em;font-size:14px;margin:0 0 24px">VIRZEEN</p>
<h1 style="font-size:24px;font-weight:500;margin:0 0 8px">We'll be back soon.</h1>
<p style="margin:0;color:${colors.inkMuted}">We're doing some quick maintenance. Please try again in a few minutes.</p></main>
</body></html>`;

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
  if (MAINTENANCE) {
    return new NextResponse(MAINTENANCE_PAGE, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "600",
        "Cache-Control": "no-store",
      },
    });
  }

  const { pathname, search } = request.nextUrl;
  if (SITE_ORIGIN && isRailwayHost(request.headers.get("host"))) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, SITE_ORIGIN), 308);
  }

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
