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

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

type ShopToolbarProps = { sizes: string[]; colors: string[]; resultLabel: string };

/** Sort + filters, kept in the URL so results are shareable and server-rendered. */
export function ShopToolbar({ sizes, colors, resultLabel }: ShopToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    size: params.get("size") ?? "",
    color: params.get("color") ?? "",
    inStock: params.get("inStock") === "1",
  });

  function navigate(next: URLSearchParams) {
    next.delete("cursor");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setSort(sort: string) {
    const next = new URLSearchParams(params);
    if (sort === "newest") next.delete("sort");
    else next.set("sort", sort);
    navigate(next);
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

  const activeCount = ["size", "color", "inStock"].filter((key) => params.has(key)).length;

  return (
    <div className="gap-4 py-3 flex items-center justify-between border-y border-line">
      <p className="text-small text-ink-muted" aria-live="polite">
        {resultLabel}
      </p>
      <div className="gap-2 flex items-center">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" shape="pill">
              <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            title="Filters"
            footer={
              <div className="gap-3 flex">
                <Button
                  variant="secondary"
                  shape="pill"
                  className="flex-1"
                  onClick={() => setDraft({ size: "", color: "", inStock: false })}
                >
                  Clear
                </Button>
                <Button shape="pill" className="flex-1" onClick={applyFilters}>
                  Show results
                </Button>
              </div>
            }
          >
            <Stack gap={6} className="pb-2">
              {sizes.length > 0 && (
                <FormField label="Size">
                  <RadioGroup
                    variant="card"
                    value={draft.size}
                    onValueChange={(size) => setDraft((d) => ({ ...d, size: d.size === size ? "" : size }))}
                  >
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
                    className="sm:grid-cols-3 grid-cols-2"
                  >
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
        <div className="w-44">
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
