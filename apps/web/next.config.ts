import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Security headers from docs/security/security-policy.md §5. The CSP (with a per-request nonce) is set in
// src/proxy.ts because it must change on every request.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    "@virzeen/ui",
    "@virzeen/core",
    "@virzeen/db",
    "@virzeen/validators",
    "@virzeen/emails",
  ],
  env: {
    // Public by design: needed by the image loader in the browser. The API key/secret stay server-only.
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? "",
  },
  images: {
    loader: "custom",
    loaderFile: "./src/client/lib/image-loader.ts",
    // A small fixed set of widths keeps Cloudinary transformations (credits) bounded (project-brief.md §10).
    deviceSizes: [400, 800, 1200, 1600],
    imageSizes: [96, 200],
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/(account|checkout|admin|api)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "virzeen",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Source maps upload only when SENTRY_AUTH_TOKEN (or .env.sentry-build-plugin) is present.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  telemetry: false,
});
