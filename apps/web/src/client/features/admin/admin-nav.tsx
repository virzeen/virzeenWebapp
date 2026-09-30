"use client";

import { Link } from "@virzeen/ui";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/size-guides", label: "Size guides" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
] as const;

/**
 * Section links: a wrapping row on phones and tablets (every section stays in view), a column from lg that stays in
 * place while the page scrolls (owner, 2026-09-30).
 */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="flex flex-wrap gap-x-4 md:gap-x-6 lg:sticky lg:top-8 lg:flex-col lg:flex-nowrap lg:gap-0 lg:self-start"
    >
      {ITEMS.map((item) => {
        const active = "exact" in item ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} variant="nav" aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
