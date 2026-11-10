"use client";

import { Button, Sheet, SheetClose, SheetContent, SheetTrigger } from "@virzeen/ui";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { InstallAppButton } from "@/client/components/shared/install-app";
import { type MenuCategory, MenuMain, menuHrefs } from "./mobile-nav-views";
import { currentHref } from "./nav-current";

type MobileNavProps = {
  categories: MenuCategory[];
  /** A live "sale" collection: the Sale row shows only then (as in the header). */
  hasSale: boolean;
  isSignedIn: boolean;
  firstName: string | null;
};

/**
 * The phone menu (until xl, specs/mobile-menu.md): Nike's content in apple.com's motion. A top Sheet drops down over
 * the whole screen and its rows fade in one after another: the greeting, the header's links as large rows (New and
 * Featured, Sale while it's live, every category), then the small icon links. Every link closes it, and so does any
 * navigation (browser Back); focus goes back to the menu button.
 */
export function MobileNav({ categories, hasSale, isSignedIn, firstName }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shownPath, setShownPath] = useState(pathname);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // A new page (a link, or browser Back while the menu is open) closes the menu.
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  const current = currentHref(pathname, menuHrefs(isSignedIn, categories, hasSale));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" shape="pill" aria-label="Open menu" className="xl:hidden">
          <Menu className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        title="Menu"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstLinkRef.current?.focus();
        }}
        header={
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              shape="pill"
              aria-label="Close menu"
              className="-mr-2 ml-auto"
            >
              <X className="size-6" strokeWidth={1.5} aria-hidden />
            </Button>
          </SheetClose>
        }
      >
        <nav aria-label="Main">
          <MenuMain
            isSignedIn={isSignedIn}
            firstName={firstName}
            categories={categories}
            hasSale={hasSale}
            firstLinkRef={firstLinkRef}
            // Phones only (it renders nothing on computers, in the installed app and once installed). The menu
            // closes first, so the browser's install panel or the guide opens over the page.
            install={
              <InstallAppButton
                placement="menu"
                onStart={() => setOpen(false)}
                className="min-h-11 w-full gap-3 px-0 text-body"
              />
            }
            ariaCurrent={(href) => (href === current ? "page" : undefined)}
            onNavigate={() => setOpen(false)}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
