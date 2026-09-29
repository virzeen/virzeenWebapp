"use client";

import {
  Button,
  Checkbox,
  FormField,
  RadioGroup,
  RadioGroupItem,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  Stack,
} from "@virzeen/ui";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useProductResults } from "./product-grid";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const FILTER_KEYS = ["size", "color", "inStock"] as const;

type Draft = { size: string; color: string; inStock: boolean };

const draftFrom = (params: URLSearchParams): Draft => ({
  size: params.get("size") ?? "",
  color: params.get("color") ?? "",
  inStock: params.get("inStock") === "1",
});

/** "12 products", or "12+ products" while "Load more" has more to show. */
function resultLabel(count: number, hasMore: boolean) {
  if (count === 0) return "No products";
  if (hasMore) return `${count}+ products`;
  return count === 1 ? "1 product" : `${count} products`;
}

type ShopToolbarProps = { sizes: string[]; colors: string[] };

/**
 * Sort + filters, kept in the URL so results are shareable and server-rendered.
 * Sits inside `ProductResults`, which gives it the live product count.
 */
export function ShopToolbar({ sizes, colors }: ShopToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { items, cursor } = useProductResults();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(params));

  function navigate(next: URLSearchParams) {
    next.delete("cursor");
    const query = next.toString();
    if (query === params.toString()) return;
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setSort(sort: string) {
    const next = new URLSearchParams(params);
    if (sort === "newest") next.delete("sort");
    else next.set("sort", sort);
    navigate(next);
  }

  // The sheet always opens on the filters in the URL, not on choices left unapplied last time.
  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setDraft(draftFrom(params));
    setOpen(nextOpen);
  }

  function applyFilters() {
    const next = new URLSearchParams(params);
    for (const key of ["size", "color"] as const) {
      if (draft[key]) next.set(key, draft[key]);
      else next.delete(key);
    }
    if (draft.inStock) next.set("inStock", "1");
    else next.delete("inStock");
    navigate(next);
    setOpen(false);
  }

  function clearFilters() {
    const next = new URLSearchParams(params);
    for (const key of FILTER_KEYS) next.delete(key);
    navigate(next);
    setOpen(false);
  }

  const activeCount = FILTER_KEYS.filter((key) => params.has(key)).length;
  const hasDraft = Boolean(draft.size || draft.color || draft.inStock);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-line py-3">
      <p className="text-small whitespace-nowrap text-ink-muted" aria-live="polite">
        {resultLabel(items.length, Boolean(cursor))}
      </p>
      {/* Phones: the controls get their own row; at 320px the sort box drops under Filters. There the ghost
          button's padding is pulled into the gutter, so its icon lines up with the count and the sort box. */}
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        <Sheet open={open} onOpenChange={changeOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" shape="pill" className="-ml-4 sm:ml-0">
              <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            title="Filters"
            footer={
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  shape="pill"
                  className="flex-1"
                  disabled={activeCount === 0 && !hasDraft}
                  onClick={clearFilters}
                >
                  Clear all
                </Button>
                <Button shape="pill" className="flex-1" onClick={applyFilters}>
                  Show results
                </Button>
              </div>
            }
          >
            <Stack gap={6} className="pb-2">
              {/* "Any" (value "") is how a chosen size or colour is removed: a radio can't be unticked. */}
              {sizes.length > 0 && (
                <FormField label="Size">
                  <RadioGroup
                    variant="card"
                    value={draft.size}
                    onValueChange={(size) => setDraft((d) => ({ ...d, size }))}
                  >
                    <RadioGroupItem value="" label="Any" />
                    {sizes.map((size) => (
                      <RadioGroupItem key={size} value={size} label={size} />
                    ))}
                  </RadioGroup>
                </FormField>
              )}
              {colors.length > 0 && (
                <FormField label="Colour">
                  <RadioGroup
                    variant="card"
                    value={draft.color}
                    onValueChange={(color) => setDraft((d) => ({ ...d, color }))}
                    className="grid-cols-2 sm:grid-cols-3"
                  >
                    <RadioGroupItem value="" label="Any" />
                    {colors.map((color) => (
                      <RadioGroupItem key={color} value={color} label={color} />
                    ))}
                  </RadioGroup>
                </FormField>
              )}
              <Checkbox
                label="In stock only"
                checked={draft.inStock}
                onCheckedChange={(checked) => setDraft((d) => ({ ...d, inStock: checked === true }))}
              />
            </Stack>
          </SheetContent>
        </Sheet>
        <div className="min-w-48 flex-1 sm:w-48 sm:flex-none">
          <Select
            aria-label="Sort by"
            options={SORT_OPTIONS}
            value={params.get("sort") ?? "newest"}
            onValueChange={setSort}
          />
        </div>
      </div>
    </div>
  );
}
