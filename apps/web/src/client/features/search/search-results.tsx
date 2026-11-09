"use client";

import { Alert, Button, ButtonLink, EmptyState, Grid, Link, Skeleton } from "@virzeen/ui";
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

const SKELETONS = ["a", "b", "c", "d", "e", "f"];
const CHIP =
  "inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-body text-ink transition-colors duration-150 ease-standard hover:bg-line hover:text-ink";

export const searchHref = (query: string) => `/shop?q=${encodeURIComponent(query)}`;

/**
 * What the search panel shows under the box (specs/search.md, Nike's layout): "Popular search terms" chips before
 * typing, then up to 6 product cards (the shop's grid: 2 a row, 3 from lg) with "See all results", the no-results message, or an error with "Try again".
 * A hidden status line reads the count.
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

      {state.status === "idle" && <PopularTerms categories={categories} onNavigate={onNavigate} />}

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
        <Grid columns="products" gap={4}>
          {SKELETONS.map((id) => (
            <div key={id} className="flex flex-col gap-3">
              <Skeleton shape="square" />
              <Skeleton shape="text" className="w-3/4" />
              <Skeleton shape="text" className="w-1/3" />
            </div>
          ))}
        </Grid>
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
          <Grid columns="products" gap={4} role="list" aria-label="Products">
            {items.map((product) => (
              <div key={product.id} role="listitem">
                <ProductCard product={product} onNavigate={onNavigate} />
              </div>
            ))}
          </Grid>
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

/**
 * "Popular search terms" as grey pills (Nike's). Until searches are counted, the terms are the shop's categories;
 * each one searches for its name.
 */
function PopularTerms({ categories, onNavigate }: Pick<SearchResultsProps, "categories" | "onNavigate">) {
  const headingId = useId();
  if (categories.length === 0) return null;
  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-body text-ink-muted">
        Popular search terms
      </h2>
      <ul className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={searchHref(category.name.toLowerCase())}
              variant="subtle"
              className={CHIP}
              onNavigate={onNavigate}
            >
              {category.name.toLowerCase()}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
