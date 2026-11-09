"use client";

import { Link } from "@virzeen/ui";
import { House, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/account/settings", label: "Account details", icon: UserRound },
  { href: "/account/addresses", label: "Delivery addresses", icon: House },
] as const;

/**
 * The Settings list on the left, like Nike's (owner 2026-11-08): each section with its icon, the current one grey
 * (`Link variant="tab"`). Phones show it above the section.
 */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings">
      <ul className="flex flex-col">
        {SECTIONS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              variant="tab"
              aria-current={pathname === href ? "page" : undefined}
              className="gap-4"
            >
              <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
