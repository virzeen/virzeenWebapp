"use client";

import { Link } from "@virzeen/ui";
import { usePathname } from "next/navigation";
import { currentHref, shopNavItems } from "./nav-current";

type NavLinksProps = {
  collections: { slug: string; name: string }[];
  /** A live "sale" collection: the Sale link shows only then. */
  hasSale: boolean;
};

/**
 * Desktop header navigation (the middle of the header, from xl: every collection has a link, so it needs the room), like Nike's (owner 2026-11-08): New and Featured
 * (the shop, newest first), Sale (the "sale" collection, once it's live), then the collections (VHome, VWear…).
 * The current page carries `aria-current` for screen readers but isn't marked on screen, as on Nike's.
 */
export function NavLinks({ collections, hasSale }: NavLinksProps) {
  const pathname = usePathname();
  const items = shopNavItems(collections, hasSale);
  const current = currentHref(
    pathname,
    items.map((item) => item.href),
  );
  return (
    <nav aria-label="Main" className="hidden items-center gap-6 xl:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          variant="header"
          aria-current={item.href === current ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
