"use client";

import { Link } from "@virzeen/ui";
import { usePathname } from "next/navigation";

/** Each tab with the paths it covers: Settings holds the addresses too. */
const TABS = [
  { href: "/account", label: "Profile", covers: [] },
  { href: "/account/membership", label: "Membership", covers: [] },
  { href: "/account/orders", label: "Orders", covers: ["/account/reviews"] },
  // Its own page outside the account (guests have favourites too), listed here as well.
  { href: "/favourites", label: "Favourites", covers: [] },
  { href: "/account/settings", label: "Settings", covers: ["/account/addresses"] },
] as const;

const within = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The tab for this page: Profile only on /account itself, the others on their pages and the ones under them. */
function currentTab(pathname: string) {
  return TABS.find((tab) =>
    tab.href === "/account"
      ? pathname === "/account"
      : within(pathname, tab.href) || tab.covers.some((path) => within(pathname, path)),
  )?.href;
}

/**
 * The account's tabs, like Nike's member pages (owner 2026-11-08): Profile, Orders, Favourites, Settings (and Admin
 * for admins) in a centred row, the current one grey (`Link variant="tab"`). Phones scroll the row sideways when it
 * doesn't fit.
 */
export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const current = currentTab(usePathname());
  return (
    <nav
      aria-label="Account"
      className="-mx-gutter flex scrollbar-none gap-4 overflow-x-auto px-gutter sm:justify-center md:mx-0 md:gap-8 md:px-0"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          variant="tab"
          aria-current={tab.href === current ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" variant="tab">
          Admin
        </Link>
      )}
    </nav>
  );
}
