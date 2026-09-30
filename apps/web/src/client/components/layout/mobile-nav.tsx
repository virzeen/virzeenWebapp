"use client";

import { Button, Link, Separator, Sheet, SheetContent, SheetTrigger } from "@virzeen/ui";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { InstallAppButton } from "@/client/components/shared/install-app";
import { isCurrent, PRIMARY_NAV } from "./nav-links";

type Category = { slug: string; name: string };

/** Mobile menu in a bottom sheet (components-catalog.md: Sheet bottom for mobile menus). */
export function MobileNav({ categories, isSignedIn }: { categories: Category[]; isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const pathname = usePathname();
  const accountHref = isSignedIn ? "/account" : "/login";
  // Only the most specific match is the current page: on /shop/tops that's "Tops", not "Shop" as well.
  const current = [
    ...PRIMARY_NAV.map((item) => item.href),
    ...categories.map((c) => `/shop/${c.slug}`),
    accountHref,
  ]
    .filter((href) => isCurrent(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
  const ariaCurrent = (href: string) => (href === current ? "page" : undefined);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" shape="pill" aria-label="Open menu" className="md:hidden">
          <Menu className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" title="Menu">
        <nav aria-label="Mobile" className="flex flex-col pb-4">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              variant="nav"
              className="text-h3"
              aria-current={ariaCurrent(item.href)}
              onClick={close}
            >
              {item.label}
            </Link>
          ))}
          {categories.length > 0 && (
            <>
              <Separator className="my-4" />
              <p className="pb-2 text-caption text-ink-muted uppercase">Categories</p>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/shop/${category.slug}`}
                  variant="nav"
                  aria-current={ariaCurrent(`/shop/${category.slug}`)}
                  onClick={close}
                >
                  {category.name}
                </Link>
              ))}
            </>
          )}
          <Separator className="my-4" />
          <Link href={accountHref} variant="nav" aria-current={ariaCurrent(accountHref)} onClick={close}>
            {isSignedIn ? "Account" : "Sign in"}
          </Link>
          <InstallAppButton placement="menu" onStart={close} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
