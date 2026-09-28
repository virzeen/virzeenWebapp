// Browser error tracking with PII scrubbing. The DSN is public by design (NEXT_PUBLIC_SENTRY_DSN).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    urlQueryParams: { deny: ["data", "pidx", "ref", "next"] },
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
