"use client";

import { ButtonLink, Link } from "@virzeen/ui";
import { UserRound } from "lucide-react";
import { useSignOut } from "@/client/components/shared/sign-out-button";

type AccountMenuProps = {
  /** For the title, "Hi, {name}"; null without a name. */
  firstName: string | null;
};

const ITEM = "min-h-0 items-center py-1 text-small text-ink-muted hover:text-ink";

/**
 * The header's profile icon for a signed-in member, with Nike's hover menu (specs/member-area-nike-layout.md): the
 * icon still links to the profile, and resting the pointer on it (or tabbing to it) opens a small white panel with
 * "Hi, {name}", Profile, Orders, Favourites, Account settings and Sign out. Pure CSS: the panel shows while the wrapper
 * is hovered or holds focus, and `pt-2` bridges the gap so moving the pointer down into it does not close it. It is
 * `tone-default`, so it stays white over the dark home hero. From md, like the icon.
 */
export function AccountMenu({ firstName }: AccountMenuProps) {
  const { signOut, signingOut } = useSignOut();
  return (
    <div className="group/account relative hidden md:block" data-testid="account-menu">
      <ButtonLink href="/account" variant="ghost" size="icon" shape="pill" aria-label="My profile">
        <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
      </ButtonLink>
      <div className="invisible absolute top-full right-0 z-20 pt-2 opacity-0 transition-opacity duration-150 ease-standard group-focus-within/account:visible group-focus-within/account:opacity-100 group-hover/account:visible group-hover/account:opacity-100">
        <nav
          aria-label="Account"
          className="flex w-56 flex-col rounded-md bg-canvas p-5 tone-default shadow-md"
        >
          <span className="pb-1 text-body font-medium text-ink">
            {firstName ? `Hi, ${firstName}` : "Your account"}
          </span>
          <Link href="/account" variant="subtle" className={ITEM}>
            Profile
          </Link>
          <Link href="/account/orders" variant="subtle" className={ITEM}>
            Orders
          </Link>
          <Link href="/favourites" variant="subtle" className={ITEM}>
            Favourites
          </Link>
          <Link href="/account/settings" variant="subtle" className={ITEM}>
            Account settings
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className={`${ITEM} inline-flex cursor-pointer text-left disabled:opacity-60`}
          >
            Sign out
          </button>
        </nav>
      </div>
    </div>
  );
}
