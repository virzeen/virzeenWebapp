"use client";

import { Alert, Button, Grid } from "@virzeen/ui";
import { useState, useTransition } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { loadMoreProductsAction } from "@/server/actions/catalog";
import { ProductCard, type ProductCardData } from "./product-card";

type ProductGridProps = {
  initialItems: ProductCardData[];
  initialCursor: string | null;
  /** Current filters as plain URL params, sent back with each "Load more". */
  filters: Record<string, string>;
};

/** Product grid with cursor "Load more" (patterns.md §5). First page is server-rendered. */
export function ProductGrid({ initialItems, initialCursor, filters }: ProductGridProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      const result = await loadMoreProductsAction({ ...filters, cursor });
      if (!result.ok) return setError(messageFor(result.error));
      setItems((current) => [
        ...current,
        ...result.data.items.filter((p) => !current.some((c) => c.id === p.id)),
      ]);
      setCursor(result.data.nextCursor);
    });
  }

  return (
    <div className="flex flex-col gap-12">
      <Grid columns="products" gap={4} className="gap-y-10">
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
