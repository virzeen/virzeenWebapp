"use client";

import { Link } from "@virzeen/ui";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { useSignOut } from "@/client/components/shared/sign-out-button";

type AccountMenuProps = {
  /** For "Hi, {name}"; null without a name (email sign-ups start without one), which reads "Hi there". */
  firstName: string | null;
};

const ITEM = "min-h-0 items-center py-1 text-small text-ink-muted hover:text-ink";

/** The panel, closed; `PANEL_OPENS` adds the two rules that open it (the wrapper hovered or holding focus). */
const PANEL =
  "invisible absolute top-full right-0 z-20 pt-2 opacity-0 transition-opacity duration-150 ease-standard";
const PANEL_OPENS =
  "group-focus-within/account:visible group-focus-within/account:opacity-100 group-hover/account:visible group-hover/account:opacity-100";

/**
 * The profile for a signed-in member, in the top bar's right corner like Nike's ("Hi, {name}" and the icon), with Nike's hover menu (specs/member-area-nike-layout.md): the
 * icon still links to the profile, and resting the pointer on it (or tabbing to it) opens a small white panel with
 * "Hi, {name}" again ("Hi there" in both places while the account has no name, owner 2026-11-16, like the phone menu),
 * Profile, Orders, Favourites, Account settings and Sign out. Pure CSS: the panel shows while the wrapper
 * is hovered or holds focus, and `pt-2` bridges the gap so moving the pointer down into it does not close it. It is
 * `tone-default`, so it stays white over the dark home hero. From md, like the icon.
 *
 * Choosing a link closes the panel (owner 2026-11-16): the header stays mounted when the page changes, so the pointer
 * still resting on the panel and the clicked link still holding focus would keep it open. A click hides it and drops
 * the focus; it opens again when the pointer or the keyboard comes back to the icon, or after the pointer has left.
 */
export function AccountMenu({ firstName }: AccountMenuProps) {
  const { signOut, signingOut } = useSignOut();
  const [closed, setClosed] = useState(false);
  const greeting = firstName ? `Hi, ${firstName}` : "Hi there";
  const close = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setClosed(true);
  };
  const reopen = () => setClosed(false);
  return (
    <div className="group/account relative hidden md:block" data-testid="account-menu" onMouseLeave={reopen}>
      <Link
        href="/account"
        aria-label={firstName ? `My profile, ${firstName}` : "My profile"}
        className="inline-flex h-9 items-center gap-2 text-caption font-medium tracking-tight text-ink no-underline hover:text-ink-muted"
        onMouseEnter={reopen}
        onFocus={reopen}
        onClick={close}
      >
        <span aria-hidden>{greeting}</span>
        <UserRound className="size-5" strokeWidth={1.5} aria-hidden />
      </Link>
      <div className={closed ? PANEL : `${PANEL} ${PANEL_OPENS}`}>
        <nav
          aria-label="Account"
          className="flex w-56 flex-col rounded-md bg-canvas p-5 tone-default shadow-md"
        >
          <span className="pb-1 text-body font-medium text-ink">{greeting}</span>
          <Link href="/account" variant="subtle" className={ITEM} onClick={close}>
            Profile
          </Link>
          <Link href="/account/orders" variant="subtle" className={ITEM} onClick={close}>
            Orders
          </Link>
          <Link href="/favourites" variant="subtle" className={ITEM} onClick={close}>
            Favourites
          </Link>
          <Link href="/account/settings" variant="subtle" className={ITEM} onClick={close}>
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
