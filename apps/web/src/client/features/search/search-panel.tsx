"use client";

import { Button, Container, Input, Link, Sheet, SheetClose, SheetContent, SheetTrigger } from "@virzeen/ui";
import { SEARCH_QUERY_MAX } from "@virzeen/validators/limits";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Wordmark } from "@/client/components/layout/wordmark";
import { SearchResults, searchHref } from "./search-results";
import { useProductSearch } from "./use-product-search";

type SearchPanelProps = { categories: { slug: string; name: string }[] };

/**
 * The header's search (specs/search.md, laid out like Nike's; owner 2026-11-08): the magnifier opens a panel that
 * drops from the top (`Sheet side="drop"`: as tall as its content from md, the whole screen on phones) with the
 * rounded box focused, "Cancel" on the right and the wordmark on the left from md. The box shows only "Search" and
 * the magnifier; its label is for screen readers (an owner exception to visible labels). Results show while typing;
 * Enter opens every match on `/shop?q=`. A link inside closes it as it navigates, and so does any page change
 * (browser Back); focus goes back to the magnifier.
 */
export function SearchPanel({ categories }: SearchPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [shownPath, setShownPath] = useState(pathname);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useProductSearch();

  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  function changeOpen(next: boolean) {
    if (next) {
      setValue(""); // always opens empty, with the categories
      search.reset();
    }
    setOpen(next);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return inputRef.current?.focus();
    setOpen(false);
    router.push(searchHref(query));
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" shape="pill" aria-label="Search">
          <Search className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="drop"
        title="Search"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        header={
          // Nike's top row: the wordmark (from md), the search box in the middle column, Cancel on the right.
          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_minmax(0,56rem)_1fr]">
            <Link
              href="/"
              variant="subtle"
              aria-label="Virzeen home"
              onNavigate={() => setOpen(false)}
              className="hidden min-h-11 items-center justify-self-start text-ink hover:text-ink md:inline-flex"
            >
              <Wordmark className="h-5 w-auto" title="Virzeen" />
            </Link>
            {/* action="/shop" keeps the form working before the page's scripts load. */}
            <form role="search" action="/shop" onSubmit={submit} className="min-w-0">
              <Input
                ref={inputRef}
                name="q"
                type="search"
                variant="pill"
                startIcon={<Search className="size-5" strokeWidth={1.5} />}
                aria-label="Search products"
                placeholder="Search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={SEARCH_QUERY_MAX}
                className="search-cancel-none"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  search.change(event.target.value);
                }}
              />
            </form>
            <SheetClose asChild>
              <Button variant="ghost" shape="pill" className="justify-self-end">
                Cancel
              </Button>
            </SheetClose>
          </div>
        }
      >
        {/* The results are as wide as the shop: the page's Container, out of the sheet's own side padding. */}
        <div className="-mx-6">
          <Container className="flex flex-col gap-8 pt-4 pb-8 md:pt-8 md:pb-12">
            <SearchResults
              state={search.state}
              categories={categories}
              onNavigate={() => setOpen(false)}
              onRetry={search.retry}
            />
          </Container>
        </div>
      </SheetContent>
    </Sheet>
  );
}
