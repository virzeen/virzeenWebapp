import { ButtonLink, Container, EmptyState } from "@virzeen/ui";
import { Wordmark } from "@/client/components/layout/wordmark";

/** Branded 404 for routes outside the storefront shell (e.g. /admin for non-admins). */
export default function RootNotFound() {
  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center gap-8 py-16">
      <Wordmark className="h-6 w-auto" />
      <EmptyState
        title="We couldn't find that page."
        description="It may have moved, or the link might be wrong."
        action={
          <ButtonLink href="/" shape="pill">
            Go to the home page
          </ButtonLink>
        }
      />
    </Container>
  );
}
