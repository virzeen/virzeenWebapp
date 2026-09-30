import { Button, cn, Link, Separator } from "@virzeen/ui";
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
import { PRIMARY_NAV } from "./nav-links";

export type MenuCategory = { slug: string; name: string };

/** Portfolio and About: Shop opens its own panel instead of being a link. */
const PAGES = PRIMARY_NAV.filter((item) => item.href !== "/shop");

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
export function menuHrefs(isSignedIn: boolean, categories: MenuCategory[]) {
  return [
    isSignedIn ? "/account" : "/login",
    "/",
    ...PAGES.map((page) => page.href),
    "/shop",
    ...categories.map((category) => `/shop/${category.slug}`),
    ...SHORTCUTS.filter((item) => isSignedIn || !item.signedInOnly).map((item) => item.href),
  ];
}

type LinkState = {
  /** `aria-current="page"` for the one link that marks the current page. */
  ariaCurrent: (href: string) => "page" | undefined;
  /** Closes the menu: every link does, including the one to the page already open. */
  onNavigate: () => void;
};

type MenuMainProps = LinkState & {
  isSignedIn: boolean;
  firstName: string | null;
  /** Back from Shop: the list nudges in from the left. */
  returning: boolean;
  onOpenShop: () => void;
  firstLinkRef: Ref<HTMLAnchorElement>;
  shopButtonRef: Ref<HTMLButtonElement>;
};

/** The menu's first panel: greeting, the large page links with Shop ›, then the small icon links. */
export function MenuMain({
  isSignedIn,
  firstName,
  returning,
  onOpenShop,
  firstLinkRef,
  shopButtonRef,
  ariaCurrent,
  onNavigate,
}: MenuMainProps) {
  const greetingHref = isSignedIn ? "/account" : "/login";
  const greeting = isSignedIn ? (firstName ? `Hi, ${firstName}` : "Hi there") : "Sign in";
  return (
    <div className={cn("flex flex-col", returning && "motion-safe:animate-nudge-in-left")}>
      <Link
        ref={firstLinkRef}
        variant="menuSmall"
        href={greetingHref}
        aria-current={ariaCurrent(greetingHref)}
        onClick={onNavigate}
      >
        <UserRound className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
        {greeting}
        <ChevronRight className="ml-auto size-5 shrink-0" strokeWidth={1.5} aria-hidden />
      </Link>
      <Separator className="my-4" />
      <ul>
        <li>
          <Link variant="menu" href="/" aria-current={ariaCurrent("/")} onClick={onNavigate}>
            Home
          </Link>
        </li>
        <li>
          <Button ref={shopButtonRef} variant="menu" onClick={onOpenShop}>
            Shop
            <ChevronRight className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
          </Button>
        </li>
        {PAGES.map((page) => (
          <li key={page.href}>
            <Link variant="menu" href={page.href} aria-current={ariaCurrent(page.href)} onClick={onNavigate}>
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="mt-12">
        {SHORTCUTS.filter((item) => isSignedIn || !item.signedInOnly).map((item) => (
          <li key={item.href}>
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
      </ul>
    </div>
  );
}

type MenuShopProps = LinkState & {
  categories: MenuCategory[];
  headingRef: Ref<HTMLHeadingElement>;
};

/** The Shop panel: All products and each category with products for sale, in their order. */
export function MenuShop({ categories, headingRef, ariaCurrent, onNavigate }: MenuShopProps) {
  return (
    <div className="flex flex-col motion-safe:animate-nudge-in-right">
      {/* Takes focus on the way in (tabIndex -1), so screen readers hear where they are. */}
      <h3 ref={headingRef} tabIndex={-1} className="pb-4 font-display text-h1 font-medium text-ink">
        Shop
      </h3>
      <ul>
        <li>
          <Link variant="menu" href="/shop" aria-current={ariaCurrent("/shop")} onClick={onNavigate}>
            All products
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              variant="menu"
              href={`/shop/${category.slug}`}
              aria-current={ariaCurrent(`/shop/${category.slug}`)}
              onClick={onNavigate}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
