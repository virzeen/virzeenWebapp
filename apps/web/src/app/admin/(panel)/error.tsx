"use client";

import { Alert, Button } from "@virzeen/ui";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useTransition } from "react";

/**
 * Friendly error inside the admin frame, so the nav stays usable; never shows raw error text (ui-discipline.md §6).
 * It replaces the page, header and all, so it brings its own h1 (styled like AdminPageHeader's).
 * `retry` fetches the page from the server again (a plain `reset` would re-render the same failed result).
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-h2">Something went wrong on our side.</h1>
      <Alert
        variant="danger"
        action={
          <Button shape="pill" loading={retrying} onClick={() => startRetry(retry)}>
            Try again
          </Button>
        }
      >
        Please try again. If it keeps happening, come back in a few minutes.
      </Alert>
    </div>
  );
}
