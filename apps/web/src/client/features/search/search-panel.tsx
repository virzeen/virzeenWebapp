"use client";

import { Button, FormField, Input, Sheet, SheetClose, SheetContent, SheetTrigger } from "@virzeen/ui";
import { SEARCH_QUERY_MAX } from "@virzeen/validators/limits";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SearchResults, searchHref } from "./search-results";
import { useProductSearch } from "./use-product-search";

type SearchPanelProps = { categories: { slug: string; name: string }[] };

/**
 * The header's search (specs/search.md): an icon that opens a top Sheet over the whole screen with the box focused.
 * Results show while typing; Enter or Search opens every match on `/shop?q=`. A link inside closes it as it
 * navigates, and so does any page change (browser Back); focus goes back to the icon.
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
        side="top"
        title="Search"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        header={
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              shape="pill"
              aria-label="Close search"
              className="-mr-2 ml-auto"
            >
              <X className="size-6" strokeWidth={1.5} aria-hidden />
            </Button>
          </SheetClose>
        }
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-8">
          {/* action="/shop" keeps the form working before the page's scripts load. */}
          <form role="search" action="/shop" onSubmit={submit} className="flex items-end gap-2">
            <FormField label="Search products" className="min-w-0 flex-1">
              <Input
                ref={inputRef}
                name="q"
                type="search"
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
            </FormField>
            <Button type="submit" shape="pill">
              Search
            </Button>
          </form>
          <SearchResults
            state={search.state}
            categories={categories}
            onNavigate={() => setOpen(false)}
            onRetry={search.retry}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
