"use client";

import { Alert, Button, ButtonLink, EmptyState, Link, Skeleton } from "@virzeen/ui";
import { useId } from "react";
import { ProductCard, type ProductCardData } from "@/client/features/products/product-card";
import { resultLabel } from "@/client/features/products/shop-toolbar";
import type { SearchResultsState } from "./use-product-search";

type SearchResultsProps = {
  state: SearchResultsState;
  categories: { slug: string; name: string }[];
  /** Closes the panel as a link inside it starts navigating. */
  onNavigate: () => void;
  onRetry: () => void;
};

const RESULTS_GRID = "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-6";
const SKELETONS = ["a", "b", "c", "d", "e", "f"];

export const searchHref = (query: string) => `/shop?q=${encodeURIComponent(query)}`;

/**
 * What the search panel shows under the box (specs/search.md): the categories before typing, then up to 6 product
 * cards with "See all results", the no-results message, or an error with "Try again". A hidden status line reads
 * the count.
 */
export function SearchResults({ state, categories, onNavigate, onRetry }: SearchResultsProps) {
  const items: ProductCardData[] | null =
    state.status === "done" || state.status === "loading" ? state.items : null;
  const query = state.status === "idle" ? "" : state.query;

  return (
    <div className="flex flex-col gap-6" aria-busy={state.status === "loading"}>
      <p role="status" className="sr-only">
        {state.status === "done" ? resultLabel(state.items.length, state.hasMore) : ""}
      </p>

      {state.status === "idle" && <CategoryLinks categories={categories} onNavigate={onNavigate} />}

      {state.status === "error" && (
        <Alert
          variant="danger"
          action={
            <Button variant="secondary" size="sm" shape="pill" onClick={onRetry}>
              Try again
            </Button>
          }
        >
          {state.message}
        </Alert>
      )}

      {state.status === "loading" && !items && (
        <div className={RESULTS_GRID}>
          {SKELETONS.map((id) => (
            <div key={id} className="flex flex-col gap-3">
              <Skeleton shape="image" />
              <Skeleton shape="text" className="w-3/4" />
              <Skeleton shape="text" className="w-1/3" />
            </div>
          ))}
        </div>
      )}

      {state.status === "done" && state.items.length === 0 && (
        <EmptyState
          title={`Nothing matches "${state.query}".`}
          description="Try a different word or browse all products."
          action={
            <ButtonLink href="/shop" shape="pill" onNavigate={onNavigate}>
              Show all products
            </ButtonLink>
          }
        />
      )}

      {items && items.length > 0 && (
        <>
          <ul className={RESULTS_GRID} aria-label="Products">
            {items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
          <ButtonLink
            href={searchHref(query)}
            variant="secondary"
            shape="pill"
            className="self-center"
            onNavigate={onNavigate}
          >
            See all results
          </ButtonLink>
        </>
      )}
    </div>
  );
}

function CategoryLinks({ categories, onNavigate }: Pick<SearchResultsProps, "categories" | "onNavigate">) {
  const headingId = useId();
  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-small text-ink-muted">
        Shop by category
      </h2>
      <ul className="flex flex-col">
        <li>
          <Link href="/shop" variant="menuSmall" onNavigate={onNavigate}>
            All products
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <Link href={`/shop/${category.slug}`} variant="menuSmall" onNavigate={onNavigate}>
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
