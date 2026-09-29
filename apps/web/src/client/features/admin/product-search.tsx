"use client";

import { Button, ButtonLink, FormField, Input } from "@virzeen/ui";
import Form from "next/form";
import { useRef, useState } from "react";

/**
 * The admin products search: a GET form, so the search lives in the URL like the orders filters.
 * The box follows the URL: "Clear search" or "Show all products" empties it (the page isn't remounted on the
 * same route, so an uncontrolled box would keep the old words).
 */
export function ProductSearch({ q }: { q: string | undefined }) {
  const [value, setValue] = useState(q ?? "");
  const [shownQuery, setShownQuery] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);

  // Adopt the URL's query after a navigation (React "adjust state when a prop changes" pattern).
  if (q !== shownQuery) {
    setShownQuery(q);
    setValue(q ?? "");
  }

  return (
    <Form action="/admin/products" role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <FormField label="Search products" className="flex-1">
        <Input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Product name"
          autoComplete="off"
        />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" shape="pill">
          Search
        </Button>
        {q && (
          // The link goes away with the search, so focus moves to the box, ready for the next one.
          <ButtonLink
            href="/admin/products"
            variant="ghost"
            shape="pill"
            onClick={() => inputRef.current?.focus()}
          >
            Clear search
          </ButtonLink>
        )}
      </div>
    </Form>
  );
}
