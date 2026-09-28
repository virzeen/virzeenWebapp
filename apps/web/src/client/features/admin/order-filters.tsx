"use client";

import { Button, FormField, Input, Select } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderFiltersProps = {
  q: string;
  status: string;
  statusOptions: { value: string; label: string }[];
};

/** Search + status filter for the admin orders table (state lives in the URL). */
export function OrderFilters({ q, status, statusOptions }: OrderFiltersProps) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [selected, setSelected] = useState(status || "ALL");

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selected !== "ALL") params.set("status", selected);
    router.push(`/admin/orders${params.size ? `?${params.toString()}` : ""}`);
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
          onValueChange={setSelected}
          options={[{ value: "ALL", label: "All statuses" }, ...statusOptions]}
        />
      </FormField>
      <Button type="submit" shape="pill">
        Filter
      </Button>
    </form>
  );
}
