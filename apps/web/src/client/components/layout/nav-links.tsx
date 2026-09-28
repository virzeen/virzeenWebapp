"use client";

import { Link } from "@virzeen/ui";
import { usePathname } from "next/navigation";

export const PRIMARY_NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "About" },
] as const;

/** Desktop header navigation with the current page marked (aria-current). */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
      {PRIMARY_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          variant="nav"
          aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
