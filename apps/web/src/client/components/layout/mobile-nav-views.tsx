import { Link, Separator } from "@virzeen/ui";
import {
  ChevronRight,
  CircleHelp,
  Heart,
  type LucideIcon,
  Package,
  Settings,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import type { Ref } from "react";
import { MenuSignOut } from "./menu-sign-out";
import { shopNavItems } from "./nav-current";

export type MenuCategory = { slug: string; name: string };

type Shortcut = { href: string; label: string; icon: LucideIcon; signedInOnly?: boolean };

/** The small icon list at the bottom of the menu. Guests who open Orders are asked to sign in by the page. */
const SHORTCUTS: Shortcut[] = [
  { href: "/favourites", label: "Favourites", icon: Heart },
  { href: "/cart", label: "Bag", icon: ShoppingBag },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/settings", label: "Settings", icon: Settings, signedInOnly: true },
  { href: "/contact", label: "Help", icon: CircleHelp },
];

/** Every link the menu shows, for marking the current page. */
export function menuHrefs(isSignedIn: boolean, categories: MenuCategory[], hasSale: boolean) {
  return [
    isSignedIn ? "/account" : "/login",
    ...shopNavItems(categories, hasSale).map((item) => item.href),
    ...SHORTCUTS.filter((item) => isSignedIn || !item.signedInOnly).map((item) => item.href),
  ];
}

type MenuMainProps = {
  isSignedIn: boolean;
  firstName: string | null;
  categories: MenuCategory[];
  /** A live "sale" collection: the Sale row shows only then (as in the header). */
  hasSale: boolean;
  firstLinkRef: Ref<HTMLAnchorElement>;
  /** "Install the Virzeen app", last in the icon list (it renders nothing where it can't install). */
  install?: React.ReactNode;
  /** `aria-current="page"` for the one link that marks the current page. */
  ariaCurrent: (href: string) => "page" | undefined;
  /** Closes the menu: every link does, including the one to the page already open. */
  onNavigate: () => void;
};

/**
 * The menu: the greeting, then the header's links as large rows (New and Featured, Sale while it's live, every
 * category; owner 2026-11-10: "like the header, not Portfolio and About"), then the small icon links.
 */
export function MenuMain({
  isSignedIn,
  firstName,
  categories,
  hasSale,
  firstLinkRef,
  install,
  ariaCurrent,
  onNavigate,
}: MenuMainProps) {
  const greetingHref = isSignedIn ? "/account" : "/login";
  const greeting = isSignedIn ? (firstName ? `Hi, ${firstName}` : "Hi there") : "Sign in";
  const items = shopNavItems(categories, hasSale);
  const shortcuts = SHORTCUTS.filter((item) => isSignedIn || !item.signedInOnly);
  return (
    <div className="stagger-rows flex flex-col">
      <Link
        ref={firstLinkRef}
        data-stagger={0}
        variant="menuSmall"
        href={greetingHref}
        aria-current={ariaCurrent(greetingHref)}
        onClick={onNavigate}
      >
        <UserRound className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
        {greeting}
        <ChevronRight className="ml-auto size-5 shrink-0" strokeWidth={1.5} aria-hidden />
      </Link>
      <Separator data-stagger={1} className="my-4" />
      <ul>
        {items.map((item, index) => (
          <li key={item.href} data-stagger={2 + index}>
            <Link variant="menu" href={item.href} aria-current={ariaCurrent(item.href)} onClick={onNavigate}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="mt-12">
        {shortcuts.map((item, index) => (
          <li key={item.href} data-stagger={2 + items.length + index}>
            <Link
              variant="menuSmall"
              href={item.href}
              aria-current={ariaCurrent(item.href)}
              onClick={onNavigate}
            >
              <item.icon className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
        {isSignedIn && (
          <li data-stagger={2 + items.length + shortcuts.length}>
            <MenuSignOut onDone={onNavigate} />
          </li>
        )}
        {/* Empty where the button renders nothing: then the row is gone for screen readers too. */}
        {install && (
          <li className="empty:hidden" data-stagger={3 + items.length + shortcuts.length}>
            {install}
          </li>
        )}
      </ul>
    </div>
  );
}
