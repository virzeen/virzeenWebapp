"use client";

import { Alert, Button, Grid } from "@virzeen/ui";
import { createContext, use, useEffect, useRef, useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { loadMoreProductsAction } from "@/server/actions/catalog";
import { ProductCard, type ProductCardData } from "./product-card";

type Loaded = {
  /** The filters these products belong to; a different key means the page moved on. */
  key: string;
  items: ProductCardData[];
  cursor: string | null;
  error: string | null;
  /** Index of the first product the last "Load more" added, so focus can move to it. */
  firstNew: number | null;
};

type ProductResultsValue = Loaded & { isPending: boolean; loadMore: () => void };

const ProductResultsContext = createContext<ProductResultsValue | null>(null);

type ProductResultsProps = {
  initialItems: ProductCardData[];
  initialCursor: string | null;
  /** Current filters as plain URL params, sent back with each "Load more". */
  filters: Record<string, string>;
  children: React.ReactNode;
};

/**
 * Holds the listing's loaded products so the toolbar count and the grid stay in step after "Load more".
 * New filters from the server start a fresh list without remounting the toolbar (which would drop focus).
 */
export function ProductResults({ initialItems, initialCursor, filters, children }: ProductResultsProps) {
  const key = JSON.stringify(filters);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [isPending, startTransition] = useTransition();
  // Forget pages loaded for other filters, so going back to them starts from the server's first page.
  if (loaded && loaded.key !== key) setLoaded(null);
  const current: Loaded =
    loaded?.key === key
      ? loaded
      : { key, items: initialItems, cursor: initialCursor, error: null, firstNew: null };

  function loadMore() {
    const { items, cursor } = current;
    if (!cursor) return;
    setLoaded({ ...current, error: null });
    startTransition(async () => {
      const result = await loadMoreProductsAction({ ...filters, cursor });
      if (!result.ok) return setLoaded({ ...current, error: messageFor(result.error) });
      const added = result.data.items.filter((p) => !items.some((c) => c.id === p.id));
      setLoaded({
        key,
        items: [...items, ...added],
        cursor: result.data.nextCursor,
        error: null,
        firstNew: added.length > 0 ? items.length : null,
      });
    });
  }

  return (
    <ProductResultsContext value={{ ...current, isPending, loadMore }}>{children}</ProductResultsContext>
  );
}

/** The loaded products and "Load more", for components inside `ProductResults`. */
export function useProductResults() {
  const value = use(ProductResultsContext);
  if (!value) throw new Error("useProductResults must be used inside ProductResults");
  return value;
}

/** Product grid with cursor "Load more" (patterns.md §5). First page is server-rendered. */
export function ProductGrid() {
  const { items, cursor, error, firstNew, isPending, loadMore } = useProductResults();
  const gridRef = useRef<HTMLDivElement>(null);

  // "Load more" unmounts after the last page, so focus moves to the first new product (a card is one link).
  useEffect(() => {
    if (firstNew === null) return;
    const card = gridRef.current?.children[firstNew];
    if (card instanceof HTMLElement) card.focus();
  }, [firstNew]);

  return (
    <div className="flex flex-col gap-12">
      <Grid ref={gridRef} columns="products" gap={4} className="gap-y-10">
        {items.map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index < 2} />
        ))}
      </Grid>
      {error && (
        <Alert variant="danger" action={<Button onClick={loadMore}>Try again</Button>}>
          {error}
        </Alert>
      )}
      {cursor && !error && (
        <div className="flex justify-center">
          <Button variant="secondary" shape="pill" size="lg" loading={isPending} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
