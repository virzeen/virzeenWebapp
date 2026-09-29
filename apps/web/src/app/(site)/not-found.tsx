import { ButtonLink, Container, EmptyState } from "@virzeen/ui";
import type { Metadata } from "next";

// The tab title when a page's generateMetadata calls notFound(); a page that returns {} for a missing item
// keeps the site's default title instead.
export const metadata: Metadata = { title: "Page not found" };

/** 404 inside the storefront shell: missing products, categories and stories, and unmatched URLs ([...missing]). */
export default function NotFound() {
  return (
    <Container className="py-24">
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
