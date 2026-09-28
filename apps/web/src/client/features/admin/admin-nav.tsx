"use client";

import { Link } from "@virzeen/ui";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/customers", label: "Customers" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="-mx-4 flex gap-5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0 lg:px-0"
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
