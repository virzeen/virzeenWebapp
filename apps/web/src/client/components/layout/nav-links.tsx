"use client";

import { Link } from "@virzeen/ui";
import { usePathname } from "next/navigation";
import { currentHref, SALE_COLLECTION } from "./nav-current";

type NavLinksProps = {
  categories: { slug: string; name: string }[];
  /** A live "sale" collection: the Sale link shows only then. */
  hasSale: boolean;
};

/**
 * Desktop header navigation (the middle of the header, from xl: every category has a link, so it needs the room), like Nike's (owner 2026-11-08): New and Featured
 * (the shop, newest first), Sale (the "sale" collection, once it's live), then the categories (VHome, VWear…).
 * The current page carries `aria-current` for screen readers but isn't marked on screen, as on Nike's.
 */
export function NavLinks({ categories, hasSale }: NavLinksProps) {
  const pathname = usePathname();
  const items = [
    { href: "/shop", label: "New and Featured" },
    ...(hasSale ? [{ href: `/collections/${SALE_COLLECTION}`, label: "Sale" }] : []),
    ...categories.map((category) => ({ href: `/shop/${category.slug}`, label: category.name })),
  ];
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
