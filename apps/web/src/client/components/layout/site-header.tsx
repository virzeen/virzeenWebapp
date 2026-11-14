"use client";

import { ButtonLink, cn, Container, Link } from "@virzeen/ui";
import { UserRound } from "lucide-react";
import { HeartIcon } from "@/client/components/shared/header-icons";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BagButton } from "@/client/features/cart/bag-button";
import { SearchPanel } from "@/client/features/search/search-panel";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { useScrolled, useScrollingDown } from "./use-scrolled";
import { Wordmark } from "./wordmark";

type SiteHeaderProps = {
  isSignedIn: boolean;
  /** For the phone menu's "Hi, {name}"; null without a name. */
  firstName: string | null;
  categories: { slug: string; name: string }[];
  /** A live "sale" collection, for the Sale link. */
  hasSale: boolean;
};

/**
 * Global header, sticky. The wordmark on the left; from xl Nike's links in the middle (New and Featured, Sale, the
 * categories; owner 2026-11-08); on the right Search, Favourites, My profile (from md; signed in it opens Nike's hover
 * menu, `AccountMenu`; signed out it is a plain Sign in link, as on Nike's) and Bag, and below xl Menu (phones find
 * the account in the menu).
 * On the home page it lies over the hero photo (owner, 2026-09-30): no background and white until the page scrolls,
 * then a 70% white, blurred background with black text; no border there, so the photo reaches the top edge (a 1px
 * border would leave a white line above it). Other pages keep the white header with its line.
 * `data-sticky-header` lets globals.css keep focused elements scrolled clear of it. `data-slide-away` is set while the
 * page scrolls down (not while it holds keyboard focus): on the shop listing from lg, globals.css then slides the
 * header up out of view, like Nike's, and scrolling up brings it back.
 */
export function SiteHeader({ isSignedIn, firstName, categories, hasSale }: SiteHeaderProps) {
  const overHero = usePathname() === "/";
  const scrolled = useScrolled();
  const scrollingDown = useScrollingDown();
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  return (
    <header
      data-sticky-header
      data-slide-away={scrollingDown && !keyboardFocus ? "" : undefined}
      onFocus={(event) => setKeyboardFocus(event.target.matches(":focus-visible"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false);
      }}
      className={cn(
        "sticky top-0 z-20 pt-safe transition duration-150 ease-standard",
        !overHero && "border-b border-line bg-canvas/85 backdrop-blur-md",
        overHero && !scrolled && "bg-transparent tone-inverse",
        overHero && scrolled && "bg-canvas/70 backdrop-blur-xl",
      )}
    >
      <Container className="flex h-16 items-center justify-between xl:grid xl:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          variant="subtle"
          className="inline-flex min-h-11 items-center justify-self-start text-ink hover:text-ink"
          aria-label="Virzeen home"
        >
          <Wordmark className="h-4 w-auto sm:h-5" title="Virzeen" />
        </Link>
        <NavLinks categories={categories} hasSale={hasSale} />
        <div className="flex items-center justify-end gap-1">
          <SearchPanel categories={categories} />
          <ButtonLink href="/favourites" variant="ghost" size="icon" shape="pill" aria-label="Favourites">
            <HeartIcon />
          </ButtonLink>
          {isSignedIn ? (
            <AccountMenu firstName={firstName} />
          ) : (
            <ButtonLink
              href="/login"
              variant="ghost"
              size="icon"
              shape="pill"
              aria-label="Sign in"
              className="hidden md:inline-flex"
            >
              <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
            </ButtonLink>
          )}
          <BagButton />
          <MobileNav
            categories={categories}
            hasSale={hasSale}
            isSignedIn={isSignedIn}
            firstName={firstName}
          />
        </div>
      </Container>
    </header>
  );
}
