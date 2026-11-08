import { SEARCH_QUERY_MIN } from "@virzeen/validators/limits";
import { useEffect, useRef, useState } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { searchProductsAction } from "@/server/actions/catalog";
import type { ProductCardData } from "@/client/features/products/product-card";

/** Wait this long after the last key before asking (specs/search.md). */
const SEARCH_DELAY_MS = 250;

export type SearchResultsState =
  | { status: "idle" }
  /** `items`: the previous answer, kept on screen while the next one loads (no flash of skeletons). */
  | { status: "loading"; query: string; items: ProductCardData[] | null }
  | { status: "done"; query: string; items: ProductCardData[]; hasMore: boolean }
  | { status: "error"; query: string; message: string };

/**
 * The search panel's live results. Asks `searchProductsAction` a moment after typing stops (from the event, not an
 * effect), and shows only the answer to the latest query: one arriving late for an older query is dropped.
 */
export function useProductSearch() {
  const [state, setState] = useState<SearchResultsState>({ status: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef("");

  useEffect(() => () => clearTimeout(timer.current), []);

  async function ask(query: string) {
    // A dropped connection throws instead of returning an error result.
    const result = await searchProductsAction({ q: query }).catch(() => ({
      ok: false as const,
      error: { code: "INTERNAL" as const, message: "" },
    }));
    if (latest.current !== query) return;
    setState(
      result.ok
        ? { status: "done", query, items: result.data.items, hasMore: result.data.nextCursor !== null }
        : { status: "error", query, message: messageFor(result.error) },
    );
  }

  /** The box changed: clear the results under 2 characters, else ask after a pause. */
  function change(value: string) {
    const query = value.trim();
    if (query === latest.current) return;
    latest.current = query;
    clearTimeout(timer.current);
    if (query.length < SEARCH_QUERY_MIN) return setState({ status: "idle" });
    setState((previous) => ({
      status: "loading",
      query,
      items:
        previous.status === "done" ? previous.items : previous.status === "loading" ? previous.items : null,
    }));
    timer.current = setTimeout(() => void ask(query), SEARCH_DELAY_MS);
  }

  /** "Try again" after an error: asks for the same query at once. */
  function retry() {
    const query = latest.current;
    setState({ status: "loading", query, items: null });
    void ask(query);
  }

  /** The panel closed: forget the query and anything still on its way. */
  function reset() {
    latest.current = "";
    clearTimeout(timer.current);
    setState({ status: "idle" });
  }

  return { state, change, retry, reset };
}
