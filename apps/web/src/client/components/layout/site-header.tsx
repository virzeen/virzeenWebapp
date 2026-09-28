import { ButtonLink, Container, Link } from "@virzeen/ui";
import { UserRound } from "lucide-react";
import { BagButton } from "@/client/features/cart/bag-button";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { Wordmark } from "./wordmark";

type SiteHeaderProps = { isSignedIn: boolean; categories: { slug: string; name: string }[] };

/** Global header: navigation, wordmark, account and bag. Sticky, calm, translucent. */
export function SiteHeader({ isSignedIn, categories }: SiteHeaderProps) {
  return (
    <header className="top-0 backdrop-blur-md sticky z-10 border-b border-line bg-canvas/85">
      <Container className="h-16 grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center">
          <MobileNav categories={categories} isSignedIn={isSignedIn} />
          <NavLinks />
        </div>
        <Link href="/" variant="subtle" className="text-ink hover:text-ink" aria-label="Virzeen home">
          <Wordmark className="h-4 sm:h-5 w-auto" title="Virzeen" />
        </Link>
        <div className="gap-1 flex items-center justify-end">
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
