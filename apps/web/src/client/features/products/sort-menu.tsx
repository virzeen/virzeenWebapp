"use client";

import { Button, cn, Link, Popover, PopoverContent, PopoverTrigger } from "@virzeen/ui";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SORT_OPTIONS, useListingUrl } from "./listing-url";

/**
 * Nike's "Sort By" (owner 2026-11-08): a text button with a chevron ("Sort By: Price: Low-High" once changed) that
 * opens a short list on the right: a plain white panel, no border or shadow. Each choice is a link to the same listing
 * sorted that way. On phones it is a grey pill in the listing's sideways row (`variant="secondary" align="start"`).
 */
export function SortMenu({
  variant = "ghost",
  align = "end",
}: {
  /** `secondary` is the grey pill in the phone row; `ghost` the text button on computers. */
  variant?: "ghost" | "secondary";
  /** Which edge of the button the list lines up with (and which side its words sit on). */
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const { params, hrefWith } = useListingUrl();
  const current = SORT_OPTIONS.find((option) => option.value === params.get("sort")) ?? SORT_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          shape="pill"
          size={variant === "secondary" ? "xs" : "md"}
          className="shrink-0"
        >
          Sort By{current.value === "newest" ? "" : `: ${current.label}`}
          <ChevronDown
            className={cn("size-4 transition-transform duration-150 ease-standard", open && "rotate-180")}
            strokeWidth={1.5}
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent elevation="flat" align={align} aria-label="Sort by">
        <ul className="flex min-w-44 flex-col">
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <Link
                href={hrefWith({ sort: option.value === "newest" ? null : option.value })}
                scroll={false}
                variant="subtle"
                aria-current={option.value === current.value ? "true" : undefined}
                onNavigate={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center text-body text-ink hover:text-ink-muted aria-[current=true]:font-medium",
                  align === "end" ? "justify-end" : "justify-start",
                )}
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
