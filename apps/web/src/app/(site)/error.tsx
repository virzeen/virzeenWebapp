"use client";

import { Button, ButtonLink, Container, EmptyState } from "@virzeen/ui";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Friendly error with retry; never shows raw error text (ui-discipline.md §6). */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Container className="py-24">
      <EmptyState
        title="Something went wrong on our side."
        description="Please try again. If it keeps happening, come back in a few minutes."
        action={
          <div className="gap-3 flex flex-wrap justify-center">
            <Button shape="pill" onClick={reset}>
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
