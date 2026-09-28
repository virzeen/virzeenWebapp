"use client";

import { Button, Link, Separator, Sheet, SheetContent, SheetTrigger } from "@virzeen/ui";
import { Menu } from "lucide-react";
import { useState } from "react";
import { PRIMARY_NAV } from "./nav-links";

type Category = { slug: string; name: string };

/** Mobile menu in a bottom sheet (components-catalog.md: Sheet bottom for mobile menus). */
export function MobileNav({ categories, isSignedIn }: { categories: Category[]; isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" shape="pill" aria-label="Open menu" className="md:hidden">
          <Menu className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" title="Menu">
        <nav aria-label="Mobile" className="pb-4 flex flex-col">
          {PRIMARY_NAV.map((item) => (
            <Link key={item.href} href={item.href} variant="nav" className="text-h3" onClick={close}>
              {item.label}
            </Link>
          ))}
          {categories.length > 0 && (
            <>
              <Separator className="my-4" />
              <p className="pb-2 text-caption text-ink-muted uppercase">Categories</p>
              {categories.map((category) => (
                <Link key={category.slug} href={`/shop/${category.slug}`} variant="nav" onClick={close}>
                  {category.name}
                </Link>
              ))}
            </>
          )}
          <Separator className="my-4" />
          <Link href={isSignedIn ? "/account" : "/login"} variant="nav" onClick={close}>
            {isSignedIn ? "Account" : "Sign in"}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
