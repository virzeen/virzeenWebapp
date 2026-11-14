"use client";

import { Link } from "@virzeen/ui";
import {
  ChevronRight,
  CreditCard,
  Link2,
  Mail,
  Package,
  Ruler,
  Share2,
  UserCheck,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";

const SECTIONS = [
  {
    href: "/account/settings",
    // Phones: the Settings page is only the list, so the section has its own address.
    phoneHref: "/account/settings/details",
    // Password is reached from the Password row of Account details, so it counts as this section.
    paths: ["/account/settings", "/account/settings/details", "/account/settings/password"],
    label: "Account details",
    icon: UserRound,
  },
  {
    href: "/account/settings/payment-methods",
    phoneHref: "/account/settings/payment-methods",
    paths: ["/account/settings/payment-methods"],
    label: "Payment methods",
    icon: CreditCard,
  },
  {
    href: "/account/addresses",
    phoneHref: "/account/addresses",
    paths: ["/account/addresses"],
    label: "Delivery addresses",
    icon: Package,
  },
  {
    href: "/account/settings/shop-preferences",
    phoneHref: "/account/settings/shop-preferences",
    paths: ["/account/settings/shop-preferences"],
    label: "Shop preferences",
    icon: Ruler,
  },
  {
    href: "/account/settings/communication-preferences",
    phoneHref: "/account/settings/communication-preferences",
    paths: ["/account/settings/communication-preferences"],
    label: "Communication preferences",
    icon: Mail,
  },
  {
    href: "/account/settings/profile-visibility",
    phoneHref: "/account/settings/profile-visibility",
    paths: ["/account/settings/profile-visibility"],
    label: "Profile visibility",
    icon: Share2,
  },
  {
    href: "/account/settings/linked-accounts",
    phoneHref: "/account/settings/linked-accounts",
    paths: ["/account/settings/linked-accounts"],
    label: "Linked accounts",
    icon: Link2,
  },
  {
    href: "/account/settings/privacy",
    phoneHref: "/account/settings/privacy",
    paths: ["/account/settings/privacy"],
    label: "Privacy",
    icon: UserCheck,
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
