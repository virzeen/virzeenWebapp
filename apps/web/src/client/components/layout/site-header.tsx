import { ButtonLink, Container, Link } from "@virzeen/ui";
import { Heart, UserRound } from "lucide-react";
import { BagButton } from "@/client/features/cart/bag-button";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { Wordmark } from "./wordmark";

type SiteHeaderProps = { isSignedIn: boolean; categories: { slug: string; name: string }[] };

/**
 * Global header: navigation, wordmark, favourites, account and bag. Sticky, calm, translucent.
 * `data-sticky-header` lets globals.css keep focused elements scrolled clear of it.
 */
export function SiteHeader({ isSignedIn, categories }: SiteHeaderProps) {
  return (
    <header
      data-sticky-header
      className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur-md"
    >
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center">
          <MobileNav categories={categories} isSignedIn={isSignedIn} />
          <NavLinks />
        </div>
        <Link
          href="/"
          variant="subtle"
          className="inline-flex min-h-11 items-center text-ink hover:text-ink"
          aria-label="Virzeen home"
        >
          <Wordmark className="h-4 w-auto sm:h-5" title="Virzeen" />
        </Link>
        <div className="flex items-center justify-end gap-1">
          <ButtonLink href="/favourites" variant="ghost" size="icon" shape="pill" aria-label="Favourites">
            <Heart className="size-5" strokeWidth={1.5} aria-hidden />
          </ButtonLink>
          <ButtonLink
            href={isSignedIn ? "/account" : "/login"}
            variant="ghost"
            size="icon"
            shape="pill"
            aria-label={isSignedIn ? "Account" : "Sign in"}
          >
            <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
          </ButtonLink>
          <BagButton />
        </div>
      </Container>
    </header>
  );
}
