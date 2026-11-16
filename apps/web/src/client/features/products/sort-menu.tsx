"use client";

import {
  Button,
  cn,
  Link,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@virzeen/ui";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SORT_OPTIONS, useListingUrl } from "./listing-url";

/** "Sort By", or "Sort By: Price: Low-High" once changed. */
function useSortLabel() {
  const { params, hrefWith } = useListingUrl();
  const current = SORT_OPTIONS.find((option) => option.value === params.get("sort")) ?? SORT_OPTIONS[0];
  const label = `Sort By${current.value === "newest" ? "" : `: ${current.label}`}`;
  const hrefFor = (value: string) => hrefWith({ sort: value === "newest" ? null : value });
  return { current, label, hrefFor };
}

/**
 * Nike's "Sort By" (owner 2026-11-08). From lg a text button with a chevron that opens a short list on the right: a
 * plain white panel, no border or shadow. On phones (`variant="secondary"`, owner 2026-11-16) a small grey pill that
 * opens a bottom panel like Filters, with the choices as rows and a tick on the current one. Each choice is a link to
 * the same listing sorted that way.
 */
export function SortMenu({ variant = "ghost" }: { variant?: "ghost" | "secondary" }) {
  return variant === "secondary" ? <SortSheet /> : <SortPopover />;
}

function SortPopover() {
  const [open, setOpen] = useState(false);
  const { current, label, hrefFor } = useSortLabel();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" shape="pill" className="shrink-0">
          {label}
          <ChevronDown
            className={cn("size-4 transition-transform duration-150 ease-standard", open && "rotate-180")}
            strokeWidth={1.5}
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent elevation="flat" align="end" aria-label="Sort by">
        <ul className="flex min-w-44 flex-col">
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <Link
                href={hrefFor(option.value)}
                scroll={false}
                variant="subtle"
                aria-current={option.value === current.value ? "true" : undefined}
                onNavigate={() => setOpen(false)}
                className="flex min-h-11 items-center justify-end text-body text-ink hover:text-ink-muted aria-[current=true]:font-medium"
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function SortSheet() {
  const [open, setOpen] = useState(false);
  const { current, label, hrefFor } = useSortLabel();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="xs" shape="pill" className="shrink-0">
          {label}
          <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" title="Sort by">
        <ul className="flex flex-col">
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <Link
                href={hrefFor(option.value)}
                scroll={false}
                variant="subtle"
                aria-current={option.value === current.value ? "true" : undefined}
                onNavigate={() => setOpen(false)}
                className="flex min-h-14 items-center justify-between gap-4 text-body text-ink hover:text-ink-muted aria-[current=true]:font-medium"
              >
                {option.label}
                {option.value === current.value && <Check className="size-5" strokeWidth={1.5} aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
