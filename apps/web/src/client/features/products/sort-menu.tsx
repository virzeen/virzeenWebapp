"use client";

import { Button, cn, Link, Popover, PopoverContent, PopoverTrigger } from "@virzeen/ui";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SORT_OPTIONS, useListingUrl } from "./listing-url";

/**
 * Nike's "Sort By" (owner 2026-11-08): a text button with a chevron ("Sort By: Price: Low-High" once changed) that
 * opens a short list on the right: a plain white panel, no border or shadow. Each choice is a link to the same listing
 * sorted that way.
 */
export function SortMenu() {
  const [open, setOpen] = useState(false);
  const { params, hrefWith } = useListingUrl();
  const current = SORT_OPTIONS.find((option) => option.value === params.get("sort")) ?? SORT_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" shape="pill">
          Sort By{current.value === "newest" ? "" : `: ${current.label}`}
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
                href={hrefWith({ sort: option.value === "newest" ? null : option.value })}
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
