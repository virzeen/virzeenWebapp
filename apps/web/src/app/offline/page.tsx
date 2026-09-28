import { ButtonLink, Container, EmptyState } from "@virzeen/ui";
import type { Metadata } from "next";
import { Wordmark } from "@/client/components/layout/wordmark";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker (public/sw.js) when a page can't load without a connection. No data reads. */
export default function OfflinePage() {
  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center gap-8 py-16">
      <Wordmark className="h-6 w-auto" />
      <EmptyState
        title="You're offline."
        description="Check your connection and try again. Your bag is saved."
        action={
          <ButtonLink href="/" shape="pill">
            Try again
          </ButtonLink>
        }
      />
    </Container>
  );
}
