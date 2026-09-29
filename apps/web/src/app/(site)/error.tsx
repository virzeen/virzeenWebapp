"use client";

import { Button, ButtonLink, Container, EmptyState } from "@virzeen/ui";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useTransition } from "react";

/**
 * Friendly error with retry; never shows raw error text (ui-discipline.md §6).
 * `retry` fetches the page from the server again (a plain `reset` would re-render the same failed result).
 */
export default function SiteError({
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
    <Container className="py-24">
      <EmptyState
        titleAs="h1"
        title="Something went wrong on our side."
        description="Please try again. If it keeps happening, come back in a few minutes."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button shape="pill" loading={retrying} onClick={() => startRetry(retry)}>
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary" shape="pill">
              Go to the home page
            </ButtonLink>
          </div>
        }
      />
    </Container>
  );
}
