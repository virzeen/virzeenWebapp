import { ButtonLink, Container, EmptyState, Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { Wordmark } from "@/client/components/layout/wordmark";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Branded 404 outside the storefront shell (e.g. /admin for non-admins). Unmatched storefront URLs get
 * (site)/not-found.tsx through the (site)/[...missing] route instead.
 */
export default function RootNotFound() {
  return (
    <Container as="main" className="flex min-h-dvh flex-col items-center justify-center gap-8 py-16">
      <Link
        href="/"
        variant="subtle"
        className="inline-flex min-h-11 items-center text-ink hover:text-ink"
        aria-label="Virzeen home"
      >
        <Wordmark className="h-6 w-auto" title="Virzeen" />
      </Link>
      <EmptyState
        titleAs="h1"
        title="We couldn't find that page."
        description="It may have moved, or the link might be wrong."
        action={
          <ButtonLink href="/shop" shape="pill">
            Browse the collection
          </ButtonLink>
        }
      />
    </Container>
  );
}
