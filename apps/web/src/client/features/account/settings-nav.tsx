"use client";

import { Link } from "@virzeen/ui";
import { ChevronRight, House, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

const SECTIONS = [
  {
    href: "/account/settings",
    // Phones: the Settings page is only the list, so the section has its own address.
    phoneHref: "/account/settings/details",
    paths: ["/account/settings", "/account/settings/details"],
    label: "Account details",
    icon: UserRound,
  },
  {
    href: "/account/addresses",
    phoneHref: "/account/addresses",
    paths: ["/account/addresses"],
    label: "Delivery addresses",
    icon: House,
  },
] as const;

/**
 * The Settings list on the left from md, like Nike's (owner 2026-11-08): each section with its icon, the current one
 * grey (`Link variant="tab"`).
 */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings">
      <ul className="flex flex-col">
        {SECTIONS.map(({ href, paths, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              variant="tab"
              aria-current={(paths as readonly string[]).includes(pathname) ? "page" : undefined}
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

/**
 * Phones: the Settings page as Nike's (owner 2026-11-10): full-width rows with an icon, the label and a chevron, a line
 * under each (`Link variant="list"`); each opens its section's own page.
 */
export function SettingsList() {
  return (
    <nav aria-label="Settings">
      <ul className="border-t border-line">
        {SECTIONS.map(({ phoneHref, label, icon: Icon }) => (
          <li key={phoneHref}>
            <Link href={phoneHref} variant="list">
              <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
              {label}
              <ChevronRight className="ml-auto size-5 shrink-0" strokeWidth={1.5} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
