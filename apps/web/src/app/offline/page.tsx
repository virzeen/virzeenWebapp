import { ButtonLink, buttonVariants, Container, EmptyState } from "@virzeen/ui";
import type { Metadata } from "next";
import { Wordmark } from "@/client/components/layout/wordmark";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker (public/sw.js) when a page can't load without a connection. No data reads. */
export default function OfflinePage() {
  return (
    <Container as="main" className="flex min-h-dvh flex-col items-center justify-center gap-8 py-16">
      <Wordmark className="h-6 w-auto" />
      <EmptyState
        titleAs="h1"
        title="You're offline."
        description="Check your connection and try again. Your bag is saved."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            {/* The service worker serves this page in place of the one the shopper asked for, and the address
                bar keeps that page's URL. An empty href loads that URL again with a full page load, and works
                even if this page's scripts aren't cached, so it's a plain link rather than ButtonLink. */}
            <a href="" className={buttonVariants({ shape: "pill" })}>
              Try again
            </a>
            <ButtonLink href="/" variant="secondary" shape="pill">
              Go to the home page
            </ButtonLink>
          </div>
        }
      />
    </Container>
  );
}
