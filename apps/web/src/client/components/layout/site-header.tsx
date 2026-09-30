"use client";

import { ButtonLink, cn, Container, Link } from "@virzeen/ui";
import { Heart, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { BagButton } from "@/client/features/cart/bag-button";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { useScrolled } from "./use-scrolled";
import { Wordmark } from "./wordmark";

type SiteHeaderProps = {
  isSignedIn: boolean;
  /** For the phone menu's "Hi, {name}"; null without a name. */
  firstName: string | null;
  categories: { slug: string; name: string }[];
};

/**
 * Global header, sticky. The wordmark on the left; from md the page links in the middle (Inter Tight, light) and
 * Favourites, My profile and Bag on the right; phones show Favourites, Bag and Menu (the account is in the menu).
 * On the home page it lies over the hero photo (owner, 2026-09-30): no background and white until the page scrolls,
 * then a 70% white, blurred background with black text; no border there, so the photo reaches the top edge (a 1px
 * border would leave a white line above it). Other pages keep the white header with its line.
 * `data-sticky-header` lets globals.css keep focused elements scrolled clear of it.
 */
export function SiteHeader({ isSignedIn, firstName, categories }: SiteHeaderProps) {
  const overHero = usePathname() === "/";
  const scrolled = useScrolled();
  return (
    <header
      data-sticky-header
      className={cn(
        "sticky top-0 z-10 transition-colors duration-150 ease-standard",
        !overHero && "border-b border-line bg-canvas/85 backdrop-blur-md",
        overHero && !scrolled && "bg-transparent tone-inverse",
        overHero && scrolled && "bg-canvas/70 backdrop-blur-xl",
      )}
    >
      <Container className="flex h-16 items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          variant="subtle"
          className="inline-flex min-h-11 items-center justify-self-start text-ink hover:text-ink"
          aria-label="Virzeen home"
        >
          <Wordmark className="h-4 w-auto sm:h-5" title="Virzeen" />
        </Link>
        <NavLinks />
        <div className="flex items-center justify-end gap-1">
          <ButtonLink href="/favourites" variant="ghost" size="icon" shape="pill" aria-label="Favourites">
            <Heart className="size-5" strokeWidth={1.5} aria-hidden />
          </ButtonLink>
          <ButtonLink
            href={isSignedIn ? "/account" : "/login"}
            variant="ghost"
            size="icon"
            shape="pill"
            aria-label={isSignedIn ? "My profile" : "Sign in"}
            className="hidden md:inline-flex"
          >
            <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
          </ButtonLink>
          <BagButton />
          <MobileNav categories={categories} isSignedIn={isSignedIn} firstName={firstName} />
        </div>
      </Container>
    </header>
  );
}
