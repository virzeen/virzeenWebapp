"use client";

import { Link } from "@virzeen/ui";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/account/orders", label: "Orders" },
  // Its own page outside the account (guests have favourites too), listed here as well.
  { href: "/favourites", label: "Favourites" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/settings", label: "Settings" },
] as const;

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Account"
      className="-mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 md:mx-0 md:flex-col md:gap-1 md:border-0 md:px-0"
    >
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          variant="nav"
          aria-current={pathname.startsWith(item.href) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" variant="nav">
          Admin
        </Link>
      )}
    </nav>
  );
}
