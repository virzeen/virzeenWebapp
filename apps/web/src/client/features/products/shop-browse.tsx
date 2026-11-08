"use client";

import { Button, cn } from "@virzeen/ui";
import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { SortMenu } from "./sort-menu";

type ShopBrowseProps = {
  /** The h1 with the total, e.g. "Shop (12)". */
  heading: React.ReactNode;
  intro?: string | null | undefined;
  /** Below lg: the category chips and the toolbar (Filters sheet and sort). */
  phoneBar: React.ReactNode;
  /** From lg: the filters on the left (`ShopSidebar`). */
  sidebar: React.ReactNode;
  /** The product grid, or the empty state. */
  children: React.ReactNode;
};

/**
 * The shop listing laid out like Nike's from lg (owner 2026-11-08): the title with the total on the left, "Hide
 * Filters" and "Sort By" on the right, the filters in a sticky column on the left and the products 3 a row. "Hide
 * Filters" gives the grid the whole width (still 3 a row, larger). Below lg: chips, the toolbar and 2 a row.
 */
export function ShopBrowse({ heading, intro, phoneBar, sidebar, children }: ShopBrowseProps) {
  const [filtersShown, setFiltersShown] = useState(true);
  const sidebarId = useId();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          {heading}
          {intro && <p className="max-w-prose text-body-lg text-ink-muted">{intro}</p>}
        </div>
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

      <div className="flex flex-col gap-4 lg:hidden">{phoneBar}</div>

      <div
        className={cn(
          "lg:grid lg:items-start lg:gap-x-12",
          filtersShown && "lg:grid-cols-[15rem_minmax(0,1fr)]",
        )}
      >
        <aside
          id={sidebarId}
          aria-label="Filters"
          className={cn("hidden", filtersShown && "lg:sticky lg:top-24 lg:block")}
        >
          {sidebar}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
