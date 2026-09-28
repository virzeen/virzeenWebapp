// Server-side error tracking with PII scrubbing (security-policy.md §9). Enabled only in production with a DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: { allow: ["user-agent", "content-type", "accept-language"] }, response: false },
    httpBodies: [],
    urlQueryParams: { deny: ["data", "pidx", "ref", "token", "code", "next"] },
    databaseQueryData: false,
    stackFrameVariables: false,
  },
});
