"use client";

import { Button, cn } from "@virzeen/ui";
import { SlidersHorizontal } from "lucide-react";
import { useId, useRef, useState } from "react";
import { SortMenu } from "./sort-menu";
import { useStuck } from "./use-stuck";

type ShopBrowseProps = {
  /** The h1 with the total, e.g. "Shop (12)". It shrinks to `text-h3` while the bar is stuck (`group/bar`). */
  heading: React.ReactNode;
  intro?: string | null | undefined;
  /** Below lg: the collections row, then the bar with Filters and Sort By (sticks under the header). */
  phoneBar: React.ReactNode;
  /** From lg: the filters on the left (`ShopSidebar`). */
  sidebar: React.ReactNode;
  /** The product grid, or the empty state. */
  children: React.ReactNode;
};

/**
 * The shop listing laid out like Nike's from lg (owner 2026-11-08): a 64px title bar with the title and the total on
 * the left, "Show Filters" and "Sort By" on the right, then the products 3 a row. The filters start hidden; "Show
 * Filters" puts them in a column on the left. While scrolling, the bar sticks to the top (under the site header
 * when it comes back, globals.css) with a smaller title, and the filters column sticks under it and scrolls on its
 * own. Below lg (owner 2026-11-16) the same idea: the title bar sticks, the header slides away on the way down, and a
 * filter bar (Filters, Sort By) sticks under the title; the collections row between them scrolls away; 2 a row.
 */
export function ShopBrowse({ heading, intro, phoneBar, sidebar, children }: ShopBrowseProps) {
  const [filtersShown, setFiltersShown] = useState(false);
  const sidebarId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const stuck = useStuck(barRef);

  return (
    <>
      <div
        ref={barRef}
        data-listing-bar
        data-stuck={stuck ? "" : undefined}
        className="group/bar sticky z-10 -mx-gutter flex h-12 items-center justify-between gap-4 bg-canvas px-gutter transition-all duration-150 ease-standard lg:mx-0 lg:h-16 lg:px-0"
      >
        {heading}
        <div className="hidden items-center gap-1 lg:flex">
          <Button
            variant="ghost"
            shape="pill"
            aria-controls={sidebarId}
            aria-expanded={filtersShown}
            onClick={() => setFiltersShown((shown) => !shown)}
          >
            {filtersShown ? "Hide Filters" : "Show Filters"}
            <SlidersHorizontal className="size-5" strokeWidth={1.5} aria-hidden />
          </Button>
          <SortMenu />
        </div>
      </div>
      {intro && <p className="max-w-prose text-body-lg text-ink-muted">{intro}</p>}

      {/* `contents`: the phone bar's parts are the page column's own children, so the sticky one can stick all the way down. */}
      <div className="contents lg:hidden">{phoneBar}</div>

      <div
        className={cn(
          "lg:grid lg:items-start lg:gap-x-12",
          filtersShown && "lg:grid-cols-[15rem_minmax(0,1fr)]",
        )}
      >
        {/* Scrolls on its own (globals.css sets its top and height); the small inset keeps focus rings unclipped. */}
        <aside
          id={sidebarId}
          aria-label="Filters"
          data-listing-filters
          className={cn(
            "hidden",
            filtersShown &&
              "lg:sticky lg:-mx-1 lg:block lg:overflow-y-auto lg:px-1 lg:pb-6 lg:transition-all lg:duration-150 lg:ease-standard",
          )}
        >
          {sidebar}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
