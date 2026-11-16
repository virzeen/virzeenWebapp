"use client";

import {
  Button,
  Checkbox,
  FormField,
  RadioGroup,
  RadioGroupItem,
  Sheet,
  SheetContent,
  SheetTrigger,
  Stack,
} from "@virzeen/ui";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FILTER_KEYS } from "./listing-url";

type Draft = { size: string; color: string; inStock: boolean };

const draftFrom = (params: URLSearchParams): Draft => ({
  size: params.get("size") ?? "",
  color: params.get("color") ?? "",
  inStock: params.get("inStock") === "1",
});

/** "12 products", or "12+ products" while "Load more" has more to show. */
/** "1 product", "{n} products", "{n}+ products" or "No products" (content-style.md "Shop listing"). */
export function resultLabel(count: number, hasMore: boolean) {
  if (count === 0) return "No products";
  if (hasMore) return `${count}+ products`;
  return count === 1 ? "1 product" : `${count} products`;
}

type ShopToolbarProps = { sizes: string[]; colors: string[] };

/**
 * The phone "Filters" button (the sliders icon only, owner 2026-11-16) and its bottom sheet, kept in the URL so results
 * are shareable and server-rendered. It sits in the listing's sticky bar beside Sort By; the count of products is in
 * the h1 and the count of chosen filters on the icon.
 */
export function ShopToolbar({ sizes, colors }: ShopToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(params));

  function navigate(next: URLSearchParams) {
    next.delete("cursor");
    const query = next.toString();
    if (query === params.toString()) return;
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
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
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon-sm"
          shape="pill"
          className="relative shrink-0"
          aria-label={`Filters${activeCount > 0 ? ` (${activeCount})` : ""}`}
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
          {activeCount > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-ink text-caption text-canvas"
            >
              {activeCount}
            </span>
          )}
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
  );
}
