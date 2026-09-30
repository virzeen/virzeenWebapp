"use client";

import { Button, Sheet, SheetClose, SheetContent, SheetTrigger } from "@virzeen/ui";
import { ChevronLeft, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InstallAppButton } from "@/client/components/shared/install-app";
import { type MenuCategory, MenuMain, MenuShop, menuHrefs } from "./mobile-nav-views";
import { currentHref } from "./nav-current";

/** "back": the main list again after Shop (it nudges in from the left and focus returns to Shop). */
type View = "main" | "shop" | "back";

type MobileNavProps = { categories: MenuCategory[]; isSignedIn: boolean; firstName: string | null };

/**
 * The phone menu (below md), like Nike's (specs/mobile-menu.md): a right Sheet with its own top row (the X, and
 * "‹ All" in Shop), the main list, and Shop's categories in a second panel. Every link closes it, and so does any
 * navigation (browser Back); focus goes back to the menu button.
 */
export function MobileNav({ categories, isSignedIn, firstName }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [shownPath, setShownPath] = useState(pathname);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const shopButtonRef = useRef<HTMLButtonElement>(null);
  const shopHeadingRef = useRef<HTMLHeadingElement>(null);

  // A new page (a link, or browser Back while the menu is open) closes the menu.
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  // Focus follows the panel: the Shop heading on the way in, the Shop button on the way back.
  useEffect(() => {
    if (view === "shop") shopHeadingRef.current?.focus();
    if (view === "back") shopButtonRef.current?.focus();
  }, [view]);

  const current = currentHref(pathname, menuHrefs(isSignedIn, categories));
  const links = {
    ariaCurrent: (href: string) => (href === current ? ("page" as const) : undefined),
    onNavigate: () => setOpen(false),
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setView("main"); // always opens on the main list
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" shape="pill" aria-label="Open menu" className="md:hidden">
          <Menu className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        title="Menu"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstLinkRef.current?.focus();
        }}
        header={
          <>
            {view === "shop" && (
              <Button variant="link" onClick={() => setView("back")} className="-ml-1">
                <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
                All
              </Button>
            )}
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
          </>
        }
      >
        <nav aria-label="Main">
          {view === "shop" ? (
            <MenuShop categories={categories} headingRef={shopHeadingRef} {...links} />
          ) : (
            <MenuMain
              isSignedIn={isSignedIn}
              firstName={firstName}
              returning={view === "back"}
              onOpenShop={() => setView("shop")}
              firstLinkRef={firstLinkRef}
              shopButtonRef={shopButtonRef}
              // Phones only (it renders nothing on computers, in the installed app and once installed). The menu
              // closes first, so the browser's install panel or the guide opens over the page.
              install={
                <InstallAppButton
                  placement="menu"
                  onStart={() => setOpen(false)}
                  className="min-h-11 w-full gap-3 px-0 text-body"
                />
              }
              {...links}
            />
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
