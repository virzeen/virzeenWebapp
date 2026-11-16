"use client";

import { FormField, Input, Select } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OrderFiltersProps = {
  q: string;
  status: string;
  statusOptions: { value: string; label: string }[];
};

/** How long typing pauses before the search runs. */
const SEARCH_DELAY_MS = 400;

/**
 * Search + status filter for the admin orders table (state lives in the URL). Filters apply by themselves: choosing a
 * status runs at once, and typing in the search runs when it pauses (or on Enter); there is no Filter button.
 */
export function OrderFilters({ q, status, statusOptions }: OrderFiltersProps) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [selected, setSelected] = useState(status || "ALL");
  const [shown, setShown] = useState({ q, status });

  // The controls follow the URL: "Orders" in the nav, a dashboard tile or "Clear filters" navigate on the same
  // route, which doesn't remount this form, so its state would keep (and Filter re-apply) the old filters.
  // Adjusting state here instead of remounting keeps keyboard focus on the Filter button.
  if (shown.q !== q || shown.status !== status) {
    setShown({ q, status });
    setQuery(q);
    setSelected(status || "ALL");
  }

  function go(nextQuery: string, nextStatus: string, replace: boolean) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    const href = `/admin/orders${params.size ? `?${params.toString()}` : ""}`;
    if (replace) router.replace(href);
    else router.push(href);
  }

  // Typing runs the search once it pauses; the URL's own query (after a navigation) needs no new search.
  useEffect(() => {
    if (query.trim() === q.trim()) return;
    const timer = setTimeout(() => go(query, selected, true), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` only reads these values and the stable router.
  }, [query, q, selected]);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    go(query, selected, false);
  }

  return (
    <form onSubmit={apply} role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <FormField label="Search" className="flex-1">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Order number or email"
          autoComplete="off"
        />
      </FormField>
      <FormField label="Status" className="sm:w-56">
        <Select
          value={selected}
          onValueChange={(next) => {
            setSelected(next);
            go(query, next, false);
          }}
          options={[{ value: "ALL", label: "All statuses" }, ...statusOptions]}
        />
      </FormField>
    </form>
  );
}
